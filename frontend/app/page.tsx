import axios from "axios";
import { Suspense } from "react";
import Mqtt from "./components/Mqtt";

export default async function Home() {
  const data = await axios.get("http://localhost:5000/");
  const text = data.data;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="my-5">
              <h1 className="text-5xl font-bold">{text}</h1>
            </div>
            <div className="grid h-20 card bg-base-300 rounded-box place-items-center cursor-pointer transition-all duration-400 hover:bg-primary">
              Create a new game
            </div>
            <div className="divider">OR</div>
            <div className="grid h-20 card bg-base-300 rounded-box place-items-center cursor-pointer transition-all duration-400 hover:bg-primary">
              Join an existing game
            </div>
          </div>
        </div>
        <Mqtt />
      </div>
    </Suspense>
  );
}
