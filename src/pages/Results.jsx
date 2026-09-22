import { useLocation, useNavigate } from "react-router-dom";
import "./Results.css";

function Results() {
    const location = useLocation();
    const navigate = useNavigate();

    const roomCode = location.state?.roomCode || "------";
    const players = location.state?.players || [];

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    if (sortedPlayers.length === 0) {
        return (
            <main className="results-page">
                <section className="results-card">
                    <h1 className="results-title">Game Results</h1>
                    <p className="results-empty">No result data found.</p>

                    <div className="results-actions">
                        <button onClick={() => navigate("/")}>
                            Back Home
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="results-page">
            <section className="results-card">
                <div className="results-top">
                    <span className="results-label">GAME OVER</span>
                    <h1 className="results-title">Final Results</h1>
                    <p className="results-room">
                        Room Code: <strong>{roomCode}</strong>
                    </p>
                </div>

                <div className="winner-box">
                    <span className="winner-label">Winner</span>
                    <h2 className="winner-name">{winner.username}</h2>
                    <p className="winner-score">{winner.score} points</p>
                </div>

                <div className="scoreboard">
                    <div className="scoreboard-header">
                        <span>Rank</span>
                        <span>Player</span>
                        <span>Score</span>
                    </div>

                    {sortedPlayers.map((player, index) => (
                        <div
                            key={player.id || index}
                            className={
                                index === 0
                                    ? "score-row winner-row"
                                    : "score-row"
                            }
                        >
                            <span className="rank">#{index + 1}</span>
                            <span className="player-name">{player.username}</span>
                            <span className="player-score">{player.score}</span>
                        </div>
                    ))}
                </div>

                <div className="results-actions">
                    <button
                        className="primary-btn"
                        onClick={() => navigate("/")}
                    >
                        Back Home
                    </button>

                    <button
                        className="secondary-btn"
                        onClick={() => navigate("/")}
                    >
                        Play Again
                    </button>
                </div>
            </section>
        </main>
    );
}

export default Results;