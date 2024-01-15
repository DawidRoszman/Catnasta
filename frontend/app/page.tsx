import axios from "axios";
import { Suspense } from "react";
import SetUsername from "./components/SetUsername";
import Loading from "./components/Loading";
import MqttChat from "./components/MqttChat";
import GameMenu from "./components/GameMenu";

export default async function Home() {
  const data = await axios.get("http://localhost:5000/");
  const text = data.data;
  return (
    <Suspense fallback={<Loading />}>
      <SetUsername />
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="my-5">
              <h1 className="text-5xl font-bold">{text}</h1>
            </div>
            <GameMenu />
            <MqttChat />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
