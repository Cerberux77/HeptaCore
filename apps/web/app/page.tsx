import { TurpialConsole } from "../components/turpial-console";
import { getTurpialConsoleData } from "../lib/turpial";

export default function Home() {
  const turpial = getTurpialConsoleData();
  return <TurpialConsole data={turpial} />;
}
