// Action Creators
export function fetchAstronauts(astronauts) {
  return {
    type: "astronauts/astronautsLoaded",
    payload: astronauts,
  };
}

// Reducers
const initialState = {
  entities: [], //array of astronauts
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case "astronauts/astronautsLoaded":
      return {
        ...state,
        entities: action.payload,
      };

    default:
      return state;
  }
}
