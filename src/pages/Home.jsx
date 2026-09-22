import { useState } from "react";
import { useNavigate } from "react-router-dom";

import socket from "../socket";

import "./Home.css";


function Home() {

    const [username, setUsername] =
        useState("");

    const [nameConfirmed, setNameConfirmed] =
        useState(false);

    const [roomCode, setRoomCode] =
        useState("");

    const navigate =
        useNavigate();


    const handleContinue = () => {

        if (username.trim() === "") {
            return;
        }

        socket.emit(
            "setUsername",
            username.trim()
        );

        setNameConfirmed(true);
    };


    const handleCreateRoom = () => {

        socket.emit(
            "createRoom",

            (response) => {

                if (!response.success) {

                    alert(
                        response.message
                    );

                    return;
                }


                navigate(
                    "/lobby",

                    {
                        state: {

                            roomCode:
                                response.roomCode,

                            players:
                                response.players

                        }
                    }
                );

            }
        );
    };


    const handleJoinRoom = () => {

        if (
            roomCode.trim() === ""
        ) {
            return;
        }


        socket.emit(
            "joinRoom",

            roomCode
                .trim()
                .toUpperCase(),

            (response) => {

                if (!response.success) {

                    alert(
                        response.message
                    );

                    return;
                }


                navigate(
                    "/lobby",

                    {
                        state: {

                            roomCode:
                                response.roomCode,

                            players:
                                response.players

                        }
                    }
                );

            }
        );

    };


    return (

        <main className="home-page">

            <div className="home-layout">


                {/* LEFT */}

                <section className="home-main">

                    <div className="home-brand">

                        <h1>
                            INK<span>rush</span>
                        </h1>

                        <p>
                            A fast multiplayer drawing game.
                        </p>

                    </div>


                    {!nameConfirmed ? (

                        <div className="home-form">

                            <label>
                                YOUR NAME
                            </label>


                            <input
                                type="text"

                                placeholder="Enter a name"

                                value={username}

                                maxLength={16}

                                autoFocus

                                onChange={
                                    (event) =>
                                        setUsername(
                                            event.target.value
                                        )
                                }

                                onKeyDown={
                                    (event) => {

                                        if (
                                            event.key === "Enter"
                                        ) {

                                            handleContinue();

                                        }

                                    }
                                }
                            />


                            <button
                                className="primary-button"

                                onClick={
                                    handleContinue
                                }
                            >
                                Continue
                            </button>

                        </div>

                    ) : (

                        <div className="home-form">

                            <div className="playing-as">

                                <div>

                                    <span>
                                        PLAYING AS
                                    </span>

                                    <strong>
                                        {username}
                                    </strong>

                                </div>


                                <button
                                    onClick={() =>
                                        setNameConfirmed(
                                            false
                                        )
                                    }
                                >
                                    Change
                                </button>

                            </div>


                            <button
                                className="primary-button create-button"

                                onClick={
                                    handleCreateRoom
                                }
                            >
                                Create room
                            </button>


                            <div className="separator">

                                <span />

                                <p>
                                    or
                                </p>

                                <span />

                            </div>


                            <div className="join-row">

                                <input
                                    type="text"

                                    placeholder="ROOM CODE"

                                    value={
                                        roomCode
                                    }

                                    maxLength={6}

                                    onChange={
                                        (event) =>
                                            setRoomCode(
                                                event
                                                    .target
                                                    .value
                                                    .toUpperCase()
                                            )
                                    }

                                    onKeyDown={
                                        (event) => {

                                            if (
                                                event.key ===
                                                "Enter"
                                            ) {

                                                handleJoinRoom();

                                            }

                                        }
                                    }
                                />


                                <button
                                    className="join-button"

                                    onClick={
                                        handleJoinRoom
                                    }
                                >
                                    Join
                                </button>

                            </div>

                        </div>

                    )}

                </section>


                {/* RIGHT */}

                <aside className="home-about">

                    <p className="about-label">
                        HOW IT WORKS
                    </p>


                    <h2>
                        Draw.
                        <br />
                        Guess.
                        <br />
                        Score.
                    </h2>


                    <div className="how-list">

                        <div>

                            <span>
                                01
                            </span>

                            <p>
                                Create a room or join
                                with a code.
                            </p>

                        </div>


                        <div>

                            <span>
                                02
                            </span>

                            <p>
                                Choose a word when
                                it's your turn to draw.
                            </p>

                        </div>


                        <div>

                            <span>
                                03
                            </span>

                            <p>
                                Guess the drawing before
                                the timer runs out.
                            </p>

                        </div>

                    </div>


                    <div className="game-details">

                        <div>
                            <strong>
                                2–4
                            </strong>

                            <span>
                                players
                            </span>
                        </div>


                        <div>
                            <strong>
                                3
                            </strong>

                            <span>
                                rounds
                            </span>
                        </div>


                        <div>
                            <strong>
                                60s
                            </strong>

                            <span>
                                per turn
                            </span>
                        </div>

                    </div>

                </aside>

            </div>

        </main>

    );
}


export default Home;