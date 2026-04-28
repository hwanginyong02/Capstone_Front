import { Root } from "./Root";
import { routes } from "./routes";

export default function App() {
  const CurrentPage = routes[0].Component;

  return (
    <Root>
      <CurrentPage />
    </Root>
  );
}
