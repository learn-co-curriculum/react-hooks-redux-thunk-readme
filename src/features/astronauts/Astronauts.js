import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAstronauts } from "./astronautsSlice";

function Astronauts() {
  const dispatch = useDispatch();

  const astronauts = useSelector((state) => state.astronauts.entities);
  const isLoading = useSelector(
    (state) => state.astronauts.status === "loading"
  );

  function handleClick() {
    // dispatch the action creator (see below!)
    dispatch(fetchAstronauts());
  }

  if (isLoading) return <p>Loading...</p>;

  const astronautsList = astronauts.map((astro) => (
    <li key={astro.id}>{astro.name}</li>
  ));

  return (
    <div>
      <button onClick={handleClick}>Get Astronauts</button>
      {astronautsList}
    </div>
  );
}

export default Astronauts;
