// ------------------------------------
// Constants
// ------------------------------------
export const CARD_BACK_CONTENT_CHANGE = 'CARD_BACK_CONTENT_CHANGE'

// ------------------------------------
// Actions
// ------------------------------------
export function updateBackContent (payload = {}) {
  return {
    type: CARD_BACK_CONTENT_CHANGE,
    payload
  }
}

export const actions = {
  updateBackContent,
}

// ------------------------------------
// Action Handlers
// ------------------------------------
const ACTION_HANDLERS = {
  [CARD_BACK_CONTENT_CHANGE] : (state, action) => { console.log(action.payload); return { ...state, backContent: action.payload } },
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  placeholders: [],
  backContentRaw: [],
}
export default function reducer (state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type]

  return handler ? handler(state, action) : state
}
