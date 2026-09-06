import { BrowserRouter, Routes, Route } from "react-router";
import { routes } from "./routes";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={<route.Component />} />
          ))}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
