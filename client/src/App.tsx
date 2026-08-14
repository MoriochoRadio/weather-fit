import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";


function Router() {
  // BASE_URL은 로컬에서 "/", GitHub Pages 빌드에서 "/weather-fit/"가 된다.
  // 저장소 이름을 바꿔도 라우팅이 따라가도록 값을 그대로 쓴다.
  const homePath = import.meta.env.BASE_URL;

  return (
    <Switch>
      <Route path={homePath} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}

export default App;
