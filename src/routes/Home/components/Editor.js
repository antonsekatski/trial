import React from 'react'

import { connect } from 'react-redux'

import {
  convertFromRaw,
  convertToRaw,
  CompositeDecorator,
  SelectionState,
  Editor,
  Modifier,
  EditorState,
  getVisibleSelectionRect,
} from 'draft-js'

// Needed for removing a placeholder
import getRangesForDraftEntity from 'draft-js/lib/getRangesForDraftEntity'

// Code highlighter
import PrismDraftDecorator from 'draft-js-prism'

import MultiDecorator from 'draft-js-multidecorators'

import { updateBackContent } from '../../../store/card'

const classNames = require('classnames')

// Some helpful constants
const MUTABLE = 'MUTABLE'

// Initial content for testing
const rawContent = {
  entityMap: {},
  blocks: [{
    type: 'unstyled',
    text: 'Type some JavaScript below, Use "Command+Return" (or "Ctrl+Return" on Windows) to split/exit a code blocks:'
  },
  {
    type: 'unstyled',
    text: ''
  },
  {
    type: 'code-block',
    text: 'var message = "Hello World"\n    + "with four spaces indentation"\n\nconsole.log(message);'
  },
  {
    type: 'unstyled',
    text: 'And this is a code block with 2 spaces indentation'
  },
  {
    type: 'code-block',
    text: 'var message = "Hello World"\n  + "with 2 spaces indentation"\n\nconsole.log(message);'
  }]
}

// Our another awesome class
class EditorComponent extends React.Component {
  constructor (props) {
    super(props)

    // Get our blocks from initial data
    const blocks = convertFromRaw(rawContent)

    var decorator = new MultiDecorator([
      // Here we can set a syntax
      new PrismDraftDecorator({
        defaultSyntax: 'javascript',
      }),
      // Placeholder decorator
      // This decorator will have more priority
      new CompositeDecorator([
        {
          strategy: placeholderStrategy,
          component: Placeholder,
        }
      ]),
    ])

    this.state = {
      editorState: EditorState.createWithContent(blocks, decorator),
      showAddButton: false,
      showRemoveButton: false, // should component show the plus/trash button
      buttonCoords: { top: 0, left: 0 },
      isButtonFrozen: false, // when selection disappears, button should remain
    }

    this.focus = () => this.refs.editor.focus()

    // Bind our functions to the context of the component
    this.onChange = this.onChange.bind(this)
    this.addPlaceholder = this.addPlaceholder.bind(this)
    this.unfreezeButton = this.unfreezeButton.bind(this)
    this.removePlaceholder = this.removePlaceholder.bind(this)
    this.freezeButton = this.freezeButton.bind(this)
  }

  addPlaceholder () {
    const newState = {
      showAddButton: false,
      isButtonFrozen: false,
      // Remove all entities beneath the selection
      // Then add new entity
      editorState: addEntity(removeEntities(this.state.editorState), 'PLACEHOLDER', MUTABLE, {})
    }

    this.setState(newState, () => {
      setTimeout(() => this.focus(), 0)
    })
  }

  removePlaceholder () {
    // Find current placeholder key
    const selection = this.state.editorState.getSelection()
    const contentState = this.state.editorState.getCurrentContent()
    const block = contentState.getBlockForKey(selection.getStartKey())
    const placeholderKey = block.getEntityAt(selection.getStartOffset())
    
    if (!placeholderKey) { return }

    // Get range of the current entity
    const range = getRangesForDraftEntity(block, placeholderKey)

    if (range.length === 0) { return }

    // Construct a selection with entity's start and end values and the current block
    const newSelection = new SelectionState({
      anchorOffset: range[0].start,
      anchorKey: selection.getStartKey(),
      focusOffset: range[0].end,
      focusKey: block.getKey(),
      isBackward: false,
      hasFocus: selection.getHasFocus(),
    })

    this.setState({
      editorState: removeEntities(this.state.editorState, newSelection),
      showRemoveButton: false,
      isButtonFrozen: false,
    }, () => {
      setTimeout(() => this.focus(), 0)
    })
  }

  showButtons (editorState) {
    // If button is currently frozen - do nothing
    if (this.state.isButtonFrozen) { return }

    const newState = {
      showAddButton: false,
      showRemoveButton: false,
    }

    const selection = editorState.getSelection()

    // Prevent multiple blocks placeholders
    const startKey = selection.getStartKey()
    const endKey = selection.getEndKey()
    if (startKey !== endKey) {
      newState.showAddButton = false
      newState.showRemoveButton = false
      return newState
    }

    // Do some magic manipulations to get the entity under selection
    const contentState = editorState.getCurrentContent()
    const block = contentState.getBlockForKey(selection.getStartKey())
    const placeholderKey = block.getEntityAt(selection.getStartOffset())

    // If there is a range - let's check for 2 cases: if the selection is on a placeholder or not
    if (!selection.isCollapsed()) {
      if (placeholderKey) { return newState }

      // Get coordinates of current selection
      const rect = getVisibleSelectionRect(window)

      if (rect) {
        // Make the button visible
        newState.showAddButton = true

        // Calculate coordinates
        newState.buttonCoords = {
          top: Math.round(rect.top + window.scrollY - 12), // To position the button properly we need to subtract a half of button height and add scrollY because it's relative to viewport
          left: Math.round(rect.left + rect.width - 12),
        }

        return newState
      }
    }

    // Show remove button
    if (placeholderKey) {
      // DraftJS can't point out on DOM element - handle it manually
      const sel = document.getSelection()

      if (sel.focusNode && sel.focusNode.parentNode) {
        const rect = sel.baseNode.parentNode.getBoundingClientRect()

        // Show trash button
        newState.showRemoveButton = true

        // Calculate coordinates
        newState.buttonCoords = {
          top: Math.round(rect.top - 12), // To position the button properly we need to subtract a half of button height
          left: Math.round(rect.left + rect.width - 12),
        }

        return newState
      }
    }

    return newState
  }

  // It's better not to keep DraftJS EditorState in Redux
  // So we're going to update only current card data like backContentRaw (for future editing) and placeholders
  onChange (editorState) {
    const newState = {
      editorState,
      ...this.showButtons(editorState)
    }

    // Update our Redux store
    this.props.updateBackContent({
      placeholders: extractPlaceholders(editorState),
      backContentRaw: convertToRaw(editorState.getCurrentContent()),
    })

    this.setState(newState)
  }

  unfreezeButton () {
    this.setState({
      isButtonFrozen: false,
    })
  }

  freezeButton () {
    this.setState({
      isButtonFrozen: true,
    })
  }

  render () {
    const buttonStyle = {
      top: this.state.buttonCoords.top,
      left: this.state.buttonCoords.left,
    }

    return (
      <div>
        <button
          className={classNames('editorButton', { 'hidden': !this.state.showAddButton })}
          style={buttonStyle}
          onClick={this.addPlaceholder}
          onMouseEnter={this.freezeButton}
          onMouseLeave={this.unfreezeButton}>
          <i className='fa fa-plus' />
        </button>

        <button
          className={classNames('editorButton editorButton--dark', { 'hidden': !this.state.showRemoveButton })}
          style={buttonStyle}
          onClick={this.removePlaceholder}
          onMouseEnter={this.freezeButton}
          onMouseLeave={this.unfreezeButton}>
          <i className='fa fa-trash-o' />
        </button>

        <div className='editor' onClick={this.focus}>
          <Editor
            editorState={this.state.editorState}
            onChange={this.onChange}
            placeholder='Enter some text...'
            ref='editor'
            />
        </div>
      </div>
    )
  }
}

// A component for rendering placeholders
const Placeholder = (props) => {
  return (
    <span data-offset-key={props.offsetkey} className='placeholder'>
      {props.children}
    </span>
  )
}

// Helper function for finding PLACEHOLDER entities
function placeholderStrategy (contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity()
      if (entityKey === null) {
        return false
      }
      return true
    },
    callback
  )
}

function addEntity (editorState, ...args) {
  const contentState = editorState.getCurrentContent()

  // Create entity
  const contentStateWithEntity = contentState.createEntity(...args)

  // Magic manipulations to add an entity to editor
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
  const selectionState = editorState.getSelection()
  const newContentState = Modifier.applyEntity(
    contentStateWithEntity,
    selectionState,
    entityKey
  )

  return EditorState.push(editorState, newContentState)
}

function removeEntities (editorState, selection) {
  const contentState = editorState.getCurrentContent()
  const newContentState = Modifier.applyEntity(contentState, selection || editorState.getSelection(), null)
  return EditorState.push(editorState, newContentState, 'apply-entity')
}

function extractPlaceholders (editorState) {
  const contentState = editorState.getCurrentContent()
  
  // Iterate through all blocks
  return contentState.getBlocksAsArray().map(contentBlock => {
    const blockData = {
      text: contentBlock.getText(), // Get Block context
      placeholders: [],
    }

    // Find all entities ranges
    contentBlock.findEntityRanges(character => {
      const entityKey = character.getEntity()
      if (entityKey === null) {
        return false
      }
      return true
    },
    (start, stop) => { blockData.placeholders.push({ start, stop }) }
    )

    return blockData
  })
}

const mapDispatchToProps = {
  updateBackContent,
}

export default connect(() => {}, mapDispatchToProps)(EditorComponent)
