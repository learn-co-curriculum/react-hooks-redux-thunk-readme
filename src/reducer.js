import { combineReducers } from "redux";
import astronautsReducer from "./features/astronauts/astronautsSlice";

export default combineReducers({
  astronauts: astronautsReducer,
});
