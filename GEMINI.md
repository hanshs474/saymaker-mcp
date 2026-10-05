# SayMaker

This extension adds SayMaker's image and video models as tools: `list_models`, `generate_image`, `edit_image`, `generate_video`, `get_task`, `open_in_saymaker`.

- It needs `SAYMAKER_API_KEY` in the environment (create one at https://saymaker.ai/settings/apikeys). If a tool says no key is set, tell the user that, with the link.
- Video takes minutes: `generate_video` returns a task id; call `get_task` later rather than waiting in a loop.
- For an edit, the prompt names the change **and what must stay** ("keep the face and background as they are").
- On a free account `minimax-h3-fast` is the video model that runs; Veo 3.1, Kling 3.0 and Seedance 2.0 need a plan or a credit pack.
