"use client";
import axios from "axios";
import { api } from "../lib/api";
import { useCookies } from "next-client-cookies";

const Login = () => {
  const cookies = useCookies();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const username = e.currentTarget.username.value;
    const password = e.currentTarget.password.value;

    try {
      const response = await axios.post(api + "/login", {
        username: username,
        password: password,
      });
      const data = response.data;
      if (data.msg !== undefined) {
        alert(data.msg);
        return;
      }
      cookies.set("token", data.token);
      alert("Logged in!");
      window.location.href = "/";
    } catch (error) {
      console.log(error);
      alert(error);
    }
  };
  return (
    <div className="grid place-items-center mt-5">
      <form onSubmit={(e) => handleSubmit(e)} className="flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            className="input input-primary"
            type="text"
            name="username"
            id="username"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input input-primary"
            type="password"
            name="password"
            id="password"
            required
          />
        </div>
        <div>
          <input className="btn btn-primary" type="submit" value="Login" />
        </div>
      </form>
    </div>
  );
};

export default Login;
