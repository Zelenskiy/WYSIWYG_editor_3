import { createFileRoute } from "@tanstack/react-router";
import Editor from "../components/editor/Editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HTMLEdit — WYSIWYG Editor" },
      { name: "description", content: "Простий двопанельний WYSIWYG/HTML редактор з підтримкою таблиць, зображень та вставки з Word." },
      { property: "og:title", content: "HTMLEdit — WYSIWYG Editor" },
      { property: "og:description", content: "Простий двопанельний WYSIWYG/HTML редактор з підтримкою таблиць, зображень та вставки з Word." },
    ],
  }),
  component: Editor,
  ssr: false,
});
