"use client";
import React, { useEffect } from "react";

const SetUsername = () => {
  const [name, setName] = React.useState("");
  const modalRef = React.useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username === null) modalRef.current?.showModal();
    else setName(username);
  }, []);

  modalRef.current?.addEventListener("close", () => {
    handleClick();
    if (localStorage.getItem("username") === null)
      modalRef.current?.showModal();
  });

  const handleClick = () => {
    if (name === "") {
      const username = "User-" + Math.random().toString(36).substr(2, 5);
      localStorage.setItem("username", username);
      setName(username);
      return;
    }
    localStorage.setItem("username", name);
  };
  return (
    <>
      <div className="fixed top-0 right-0 p-4">
        <button
          className="btn btn-primary tooltip tooltip-bottom"
          data-tip="Edit nickname"
          onClick={() => modalRef.current?.showModal()}
        >
          {name || <div className="loading"></div>}
        </button>
      </div>
      <dialog ref={modalRef} id="setUsername" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">
            Please set your nickname before starting game
          </h3>
          <p className="py-4 text-center">
            <input
              className="input input-bordered"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </p>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default SetUsername;
