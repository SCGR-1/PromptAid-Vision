import { Button } from "@ifrc-go/ui";

function App() {
  return (
    <main className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-ifrcRed">PromptAid Vision</h1>
      <Button name="ifrc-button" size={2} variant="primary">IFRC Button</Button>
    </main>
  );
}
export default App;