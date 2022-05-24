import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { GlobeMethods } from "react-globe.gl";
import { Country } from "../lib/country";
import { answerCountry, answerName } from "../util/answer";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Guesses, Stats } from "../lib/localStorage";
import { dateDiffInDays, today } from "../util/dates";
import { polygonDistance } from "../util/distance";
import {getColourEmoji} from "../util/colour";

const Globe = lazy(() => import("./Globe"));
const Guesser = lazy(() => import("./Guesser"));
const List = lazy(() => import("./List"));
const countryData: Country[] = require("../data/country_data.json").features;

type Props = {
  reSpin: boolean;
  setShowStats: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Game({ reSpin, setShowStats }: Props) {
  // Get data from local storage
  const [storedGuesses, storeGuesses] = useLocalStorage<Guesses>("guesses", {
    day: today,
    countries: [],
  });

  const firstStats = {
    gamesWon: 0,
    lastWin: new Date(0).toLocaleDateString("en-CA"),
    currentStreak: 0,
    maxStreak: 0,
    usedGuesses: [],
    emojiGuesses: '',
  };
  const [storedStats, storeStats] = useLocalStorage<Stats>(
    "statistics",
    firstStats
  );

  // Stored guesses to state, as countries
  // If it's a new day though, start with a blank slate
  let storedCountryNames: string[] = [];
  let storedCountries: Country[] = [];
  // Check if win condition already met
  const alreadyWon = storedCountryNames.includes(answerName);

  // Now we're ready to start the game! Set up the game states with the data we
  // already know from the stored info.
  const [guesses, setGuesses] = useState<Country[]>(storedCountries);
  const [win, setWin] = useState(alreadyWon);
  const globeRef = useRef<GlobeMethods>(null!);

  useEffect(() => {
    const guessNames = guesses.map((country) => country.properties.NAME);
    storeGuesses({
      day: today,
      countries: guessNames,
    });
  }, [guesses, storeGuesses]);

  // When the player wins!
  useEffect(() => {
    if (win && storedStats.lastWin !== today) {
      // Store new stats in local storage
      const lastWin = today;
      const gamesWon = storedStats.gamesWon + 1;
      const streakBroken = dateDiffInDays(storedStats.lastWin, lastWin) > 1;
      const currentStreak = streakBroken ? 1 : storedStats.currentStreak + 1;
      const maxStreak =
        currentStreak > storedStats.maxStreak
          ? currentStreak
          : storedStats.maxStreak;
      const usedGuesses = [...storedStats.usedGuesses, guesses.length];
      const chunks = [];
      for (let i = 0; i < guesses.length; i += 8) {
        chunks.push(guesses.slice(i, i + 8));
      }
      const emojiGuesses = chunks.map(each => each.map(guess => getColourEmoji(guess, guesses[guesses.length - 1])).join('')).join('\n');
      const newStats = {
        lastWin,
        gamesWon,
        currentStreak,
        maxStreak,
        usedGuesses,
        emojiGuesses
      };
      storeStats(newStats);

      // Show stats
      setTimeout(() => setShowStats(true), 3000);
    }
  }, [win, guesses, setShowStats, storeStats, storedStats]);

  // Fallback while loading
  const renderLoader = () => <p>Loading</p>;

  return (
    <Suspense fallback={renderLoader()}>
      <Guesser
        guesses={guesses}
        setGuesses={setGuesses}
        win={win}
        setWin={setWin}
      />
      {!reSpin && (
        <div>
          <Globe guesses={guesses} globeRef={globeRef} />
          <List guesses={guesses} win={win} globeRef={globeRef} />
        </div>
      )}
    </Suspense>
  );
}
