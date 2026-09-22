import {
    useEffect,
    useState
} from "react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import socket from "../socket";

import "./Lobby.css";


function Lobby() {

    const location =
        useLocation();

    const navigate =
        useNavigate();


    const roomCode =
        location.state?.roomCode;


    const [players, setPlayers] =
        useState(
            location.state
                ?.players || []
        );


    const me =
        players.find(
            (player) =>
                player.id ===
                socket.id
        );


    const isHost =
        me?.isHost;


    useEffect(() => {

        const onPlayers =
            (updatedPlayers) => {

                setPlayers(
                    updatedPlayers
                );
            };


        const onGameStarted =
            (data) => {

                navigate(
                    "/game",
                    {
                        state: {

                            roomCode:
                                data.roomCode,

                            players:
                                data.players
                        }
                    }
                );
            };


        socket.on(
            "playersUpdated",
            onPlayers
        );


        socket.on(
            "gameStarted",
            onGameStarted
        );


        return () => {

            socket.off(
                "playersUpdated",
                onPlayers
            );


            socket.off(
                "gameStarted",
                onGameStarted
            );
        };

    }, [navigate]);


    const handleStart = () => {

        socket.emit(
            "startGame",

            roomCode,

            (response) => {

                if (
                    !response.success
                ) {

                    alert(
                        response.message
                    );
                }
            }
        );
    };


    const copyCode = () => {

        navigator.clipboard
            ?.writeText(
                roomCode
            );
    };


    // Someone manually visited /lobby
    if (!roomCode) {

        return (

            <main className="invalid-lobby">

                <h2>
                    You're not in a room.
                </h2>

                <button
                    onClick={() =>
                        navigate("/")
                    }
                >
                    Back home
                </button>

            </main>
        );
    }


    return (

        <main className="lobby-page">

            <section className="lobby-container">

                <header className="lobby-header">

                    <div>

                        <span className="lobby-label">
                            ROOM CODE
                        </span>

                        <div className="room-code-row">

                            <h1>
                                {roomCode}
                            </h1>

                            <button
                                onClick={
                                    copyCode
                                }
                            >
                                Copy
                            </button>

                        </div>

                    </div>


                    <span className="lobby-capacity">
                        {players.length} / 4 players
                    </span>

                </header>


                <div className="lobby-divider" />


                <section>

                    <div className="lobby-section-title">

                        <h2>
                            Players
                        </h2>

                        <span>
                            Waiting room
                        </span>

                    </div>


                    <div className="lobby-player-list">

                        {players.map(
                            (
                                player,
                                index
                            ) => (

                                <div
                                    className="lobby-player"
                                    key={
                                        player.id
                                    }
                                >

                                    <span className="lobby-number">
                                        {index + 1}
                                    </span>


                                    <strong>
                                        {
                                            player.username
                                        }

                                        {
                                            player.id ===
                                                socket.id &&
                                            " (you)"
                                        }
                                    </strong>


                                    {
                                        player.isHost && (

                                            <span className="host-tag">
                                                HOST
                                            </span>

                                        )
                                    }

                                </div>

                            )
                        )}


                        {Array.from({
                            length:
                                4 -
                                players.length
                        }).map(
                            (_, index) => (

                                <div
                                    className="lobby-player empty"
                                    key={
                                        index
                                    }
                                >

                                    <span className="lobby-number">
                                        {
                                            players.length +
                                            index +
                                            1
                                        }
                                    </span>

                                    <span>
                                        Waiting for player...
                                    </span>

                                </div>

                            )
                        )}

                    </div>

                </section>


                <footer className="lobby-footer">

                    {isHost ? (

                        <>

                            <span>
                                {
                                    players.length <
                                    2
                                        ? "At least 2 players are needed."
                                        : "Everyone ready?"
                                }
                            </span>


                            <button
                                className="start-button"
                                disabled={
                                    players.length <
                                    2
                                }
                                onClick={
                                    handleStart
                                }
                            >
                                Start game
                            </button>

                        </>

                    ) : (

                        <span>
                            Waiting for the host to start the game...
                        </span>

                    )}

                </footer>

            </section>

        </main>
    );
}


export default Lobby;