import {
    Routes,
    Route
} from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";


function App() {

    return (

        <>

            <Navbar />

            <Routes>

                <Route
                    path="/"
                    element={
                        <Home />
                    }
                />

                <Route
                    path="/lobby"
                    element={
                        <Lobby />
                    }
                />

                <Route
                    path="/game"
                    element={
                        <Game />
                    }
                />

                <Route
                    path="/results"
                    element={
                        <Results />
                    }
                />

            </Routes>

        </>
    );
}


export default App;