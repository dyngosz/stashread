import { mount } from "svelte";
import PopupApp from "../../components/PopupApp.svelte";
import "../../assets/styles/global.css";

const app = mount(PopupApp, {
  target: document.getElementById("app")!,
});

export default app;
