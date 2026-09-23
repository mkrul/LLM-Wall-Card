window.CARD = {
  "updatedAt": "2026-09-23T06:04:15-04:00",
  "source": "openrouter",
  "jobs": [
    {
      "id": "brainstorming",
      "job": "Brainstorming",
      "model": "Claude Opus 5.5",
      "modelId": "anthropic/claude-opus-5.5",
      "why": "Names, pitches, and product ideas that are not finished yet",
      "tasks": [
        "Product names and taglines",
        "Pitch angles and positioning",
        "Messy early feature lists",
        "Turning a vague idea into options"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Fable 5.1",
          "modelId": "anthropic/claude-fable-5.1",
          "why": "When the idea has to survive hard scrutiny",
          "tasks": [
            "Stress-testing a concept",
            "Finding the hole in a pitch",
            "Choosing among close options"
          ],
          "stale": false
        },
        {
          "model": "Claude Sonnet 5",
          "modelId": "anthropic/claude-sonnet-5",
          "why": "Quick lists and first-pass options",
          "tasks": [
            "A fast list of ideas",
            "Title and subject-line lists",
            "First-pass outlines"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "hardest-problems",
      "job": "Hardest problems",
      "model": "Claude Fable 5.1",
      "modelId": "anthropic/claude-fable-5.1",
      "why": "The hardest coding and reasoning, when a wrong answer takes hours to undo",
      "tasks": [
        "Bugs you have already spent hours on",
        "Changes across many files that are easy to get wrong",
        "Reasoning that takes many careful steps",
        "Work where a wrong turn means hours of cleanup"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-6 Astra",
          "modelId": "openai/gpt-6-astra",
          "why": "When the hard part is a long task that uses tools and has to be finished",
          "tasks": [
            "Debugging that uses several tools, from start to finish",
            "Research that has to come back as a finished document",
            "Long tasks that fail if the model stops early"
          ],
          "stale": false
        },
        {
          "model": "Claude Opus 5.5",
          "modelId": "anthropic/claude-opus-5.5",
          "why": "The same kind of hard work, at a lower price",
          "tasks": [
            "Hard coding without Fable's price",
            "Long sessions that design and then write the code",
            "Large code changes you need to read carefully"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "architecture",
      "job": "Architecture",
      "model": "Claude Opus 5.5",
      "modelId": "anthropic/claude-opus-5.5",
      "why": "Planning how the pieces of a system fit together, and changes that cross many files",
      "tasks": [
        "System design from a blank page",
        "Changes that touch many files",
        "API and module boundaries",
        "Explaining a messy codebase"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Fable 5.1",
          "modelId": "anthropic/claude-fable-5.1",
          "why": "Design decisions that are expensive to undo",
          "tasks": [
            "Design choices you cannot take back",
            "Data moves you cannot undo",
            "Design reviews that have to be right"
          ],
          "stale": false
        },
        {
          "model": "Claude Sonnet 5",
          "modelId": "anthropic/claude-sonnet-5",
          "why": "Smaller structural changes you want back fast",
          "tasks": [
            "Splitting one part of the code into smaller parts",
            "Rearranging code in one area",
            "A quick second opinion"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "everyday-coding",
      "job": "Everyday coding",
      "model": "Claude Sonnet 5",
      "modelId": "anthropic/claude-sonnet-5",
      "why": "Day-to-day edits, small features, and fast reviews",
      "tasks": [
        "Small features and bugfixes",
        "Code review on a PR",
        "Tests for a change you already understand",
        "Cleanup that should come back fast"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-5.6 Terra",
          "modelId": "openai/gpt-5.6-terra",
          "why": "The same daily coding, if you already use GPT",
          "tasks": [
            "Everyday coding on GPT",
            "Medium-sized changes",
            "The GPT model to use when Sol costs more than the task needs"
          ],
          "stale": false
        },
        {
          "model": "Claude Opus 5.5",
          "modelId": "anthropic/claude-opus-5.5",
          "why": "When the change reaches more of the project",
          "tasks": [
            "A feature that touches many parts of the project",
            "Edits that need more of the project in view",
            "Reviews of large code changes"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "daily-gpt-work",
      "job": "Middle-price daily work",
      "model": "GPT-5.6 Terra",
      "modelId": "openai/gpt-5.6-terra",
      "why": "Everyday coding and tasks that run commands, at about half the price of Sol",
      "tasks": [
        "Day-to-day coding with GPT",
        "Medium-sized features and changes",
        "Work that has to be good, without paying Sol's price",
        "The GPT model to start with when you are not sure"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-6 Sol",
          "modelId": "openai/gpt-6-sol",
          "why": "When the coding task is actually hard",
          "tasks": [
            "Coding that takes many steps",
            "Work that is mostly commands in the terminal",
            "Longer tasks that still use GPT"
          ],
          "stale": false
        },
        {
          "model": "GPT-6 Luna",
          "modelId": "openai/gpt-6-luna",
          "why": "When each task is short and you will run it thousands of times",
          "tasks": [
            "Short coding help at Luna's price",
            "Small edits",
            "GPT for a service you call many times"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "end-to-end-agents",
      "job": "Work that has to finish",
      "model": "GPT-6 Astra",
      "modelId": "openai/gpt-6-astra",
      "why": "Long tasks that use your computer, a browser, and other tools, and that fail if they stop halfway",
      "tasks": [
        "Long tasks where the model controls the computer",
        "Research that has to come back as a finished document",
        "Debugging that uses several tools and a browser",
        "Work that is useless if it stops in the middle"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Fable 5.1",
          "modelId": "anthropic/claude-fable-5.1",
          "why": "When one wrong step costs more than Astra's price",
          "tasks": [
            "Automatic edits you cannot afford to get wrong",
            "Tasks that change code close to what customers run",
            "Long tasks that must not drift into unrelated changes"
          ],
          "stale": false
        },
        {
          "model": "GPT-6 Sol",
          "modelId": "openai/gpt-6-sol",
          "why": "The same kind of long task, at a lower price",
          "tasks": [
            "Long tool tasks that should not cost what Astra costs",
            "Coding tasks that are mostly terminal commands",
            "When Astra costs more than the task is worth"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "agents-and-tools",
      "job": "Running commands",
      "model": "GPT-6 Sol",
      "modelId": "openai/gpt-6-sol",
      "why": "Long tasks where the model runs terminal commands and other tools",
      "tasks": [
        "Tasks that run commands in the terminal",
        "Tasks that need several tool steps",
        "Coding tasks across the whole project",
        "Work that fails if the model will not run the commands"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-6 Astra",
          "modelId": "openai/gpt-6-astra",
          "why": "When the task also has to control the computer or a browser",
          "tasks": [
            "Tasks that control the computer",
            "Tasks that spend most of their time in a browser",
            "The longest GPT tasks"
          ],
          "stale": false
        },
        {
          "model": "Kimi K3",
          "modelId": "moonshotai/kimi-k3",
          "why": "A model you can download that can still finish a long coding task",
          "tasks": [
            "Coding tasks you may later run on your own computer",
            "Long coding tasks on a model you can download",
            "When the code is not allowed to leave your computer"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "high-volume-grunt-work",
      "job": "Many short tasks",
      "model": "GPT-6 Luna",
      "modelId": "openai/gpt-6-luna",
      "why": "Sorting, pulling fields out of text, and other short tasks, at a low GPT price",
      "tasks": [
        "Sort items or pull fields out of text, in large numbers",
        "Short summaries, and turning text into another format",
        "A chat service you call many times",
        "Low-price GPT when the rules are already clear"
      ],
      "stale": false,
      "also": [
        {
          "model": "Gemini 3.8 Flash",
          "modelId": "google/gemini-3.8-flash",
          "why": "When the low-price task also includes pictures, or a very long document",
          "tasks": [
            "Reading many pictures or PDFs at a low price",
            "Pulling facts out of a very long document",
            "Low-price tasks that include pictures, which Luna does not accept"
          ],
          "stale": false
        },
        {
          "model": "Qwen3.8 Omni Flash",
          "modelId": "qwen/qwen3.8-omni-flash",
          "why": "The low-price Qwen model for a large number of short tasks",
          "tasks": [
            "Short coding help on Qwen",
            "A fast read of a long document",
            "Qwen for a service you call many times"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "long-documents",
      "job": "Long documents",
      "model": "Gemini 3.1 Pro Preview",
      "modelId": "google/gemini-3.1-pro-preview",
      "why": "Very long PDFs, transcripts, and files that are too long for other models",
      "tasks": [
        "Huge PDFs and books",
        "Long transcripts and notes from long meetings",
        "Many files in one pass",
        "Documents that are too long for a smaller model"
      ],
      "stale": false,
      "also": [
        {
          "model": "Qwen3.8 Max",
          "modelId": "qwen/qwen3.8-max-0902",
          "why": "Long documents that also include pictures or video",
          "tasks": [
            "A long project or a long document",
            "PDFs that include figures",
            "A video together with a long transcript"
          ],
          "stale": false
        },
        {
          "model": "Claude Opus 5.5",
          "modelId": "anthropic/claude-opus-5.5",
          "why": "Long docs when judgment matters more than window size",
          "tasks": [
            "Contracts and policy reads",
            "Judgment-heavy document review",
            "Long specs you have to interpret, not just scan"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "fast-cheap-work",
      "job": "Fast and low cost",
      "model": "Gemini 3.8 Flash",
      "modelId": "google/gemini-3.8-flash",
      "why": "A large number of drafts and summaries, including pictures, at a low price",
      "tasks": [
        "Many drafts and summaries",
        "Reading pictures, PDFs, and video at a low price",
        "Sorting and pulling out fields, in large numbers",
        "First drafts you will edit yourself"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-6 Luna",
          "modelId": "openai/gpt-6-luna",
          "why": "Low-price GPT when the task is text only",
          "tasks": [
            "A large amount of text on GPT",
            "Sorting text when you already use GPT for it",
            "Short tasks at Luna's price"
          ],
          "stale": false
        },
        {
          "model": "Qwen3.8 Omni Flash",
          "modelId": "qwen/qwen3.8-omni-flash",
          "why": "Low-price Qwen for the same kind of short work",
          "tasks": [
            "Fast first drafts on Qwen",
            "Reading pictures on Qwen at a low price",
            "A large number of short tasks on Qwen"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "images",
      "job": "Images",
      "model": "Gemini 3.1 Flash Image",
      "modelId": "google/gemini-3.1-flash-image",
      "why": "Create or edit a picture from a written description",
      "tasks": [
        "Create a picture from a written description",
        "Edits and variations",
        "Fast visual drafts",
        "Thumbnails and mockups"
      ],
      "stale": false,
      "also": [
        {
          "model": "Gemini 3 Pro Image",
          "modelId": "google/gemini-3-pro-image",
          "why": "Higher-quality images when Flash looks cheap",
          "tasks": [
            "Higher-fidelity images",
            "Follows the written description more closely",
            "When Flash looks cheap or sloppy"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "cheap-long-runs",
      "job": "Long jobs, low price",
      "model": "Grok 4.7",
      "modelId": "x-ai/grok-4.7",
      "why": "Long tasks that run commands, when the most expensive models would cost too much",
      "tasks": [
        "Long command-running tasks you will repeat",
        "Coding tasks you leave running overnight",
        "Work that uses many tools and would cost too much on Opus or Fable"
      ],
      "stale": false,
      "also": [
        {
          "model": "Kimi K3",
          "modelId": "moonshotai/kimi-k3",
          "why": "The same long tasks, on a model you can download",
          "tasks": [
            "Overnight coding tasks on Kimi",
            "A lower price than Astra or Fable",
            "When you want a copy of the model on your own computer"
          ],
          "stale": false
        },
        {
          "model": "DeepSeek V4 Pro",
          "modelId": "deepseek/deepseek-v4-pro-0813",
          "why": "Even cheaper when the task is mostly writing code",
          "tasks": [
            "Low-price tasks that are mostly code",
            "Writing a lot of code",
            "When Grok still costs more than you want to pay"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "lowest-cost",
      "job": "Lowest price",
      "model": "DeepSeek V4 Pro",
      "modelId": "deepseek/deepseek-v4-pro-0813",
      "why": "Coding and writing when the price is the limit",
      "tasks": [
        "Coding when you are choosing the lowest price",
        "Work on your own computer, or through a very cheap service",
        "Drafts and rewrites at the lowest price"
      ],
      "stale": false,
      "also": [
        {
          "model": "GPT-6 Luna",
          "modelId": "openai/gpt-6-luna",
          "why": "The cheapest GPT model. It still costs more than DeepSeek.",
          "tasks": [
            "GPT when you want a low price and DeepSeek is not an option",
            "When you need the answer in a fixed format you already use with GPT",
            "A large number of short GPT tasks"
          ],
          "stale": false
        },
        {
          "model": "Qwen3.8 Omni Flash",
          "modelId": "qwen/qwen3.8-omni-flash",
          "why": "The cheapest Qwen model for a large number of tasks",
          "tasks": [
            "Low-price coding on Qwen",
            "Qwen when the task includes pictures",
            "When the task includes pictures, which DeepSeek does not accept"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "open-weight-agents",
      "job": "Coding you run yourself",
      "model": "Kimi K3",
      "modelId": "moonshotai/kimi-k3",
      "why": "Coding tasks when you need a strong model you can download and run yourself",
      "tasks": [
        "Coding tasks you can later run on your own computer",
        "Long coding tasks without sending the code to Claude or GPT",
        "Building a screen layout from a written description",
        "When the code is not allowed to leave your computer"
      ],
      "stale": false,
      "also": [
        {
          "model": "GLM 5.3",
          "modelId": "z-ai/glm-5.3",
          "why": "A downloadable coding model that can read a very large project in one request",
          "tasks": [
            "Edits across a huge project on GLM",
            "Long tasks on a model you can download",
            "When Kimi cannot fit the whole project into one request"
          ],
          "stale": false
        },
        {
          "model": "Qwen3.8 2.4T A95B",
          "modelId": "qwen/qwen3.8-2.4t-a95b",
          "why": "The large Qwen model you can download and run yourself",
          "tasks": [
            "Run the large Qwen on your own machines",
            "When the smaller Qwen model is not strong enough",
            "Qwen as a file you control"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "qwen-work",
      "job": "Code, pictures, and video",
      "model": "Qwen3.8 Max",
      "modelId": "qwen/qwen3.8-max-0902",
      "why": "Code, pictures, and video in one request, and it can read a very long input",
      "tasks": [
        "The Qwen model for most days",
        "A request that includes a picture or a video",
        "Long projects and long documents",
        "A lower price than Gemini for pictures and long documents"
      ],
      "stale": false,
      "also": [
        {
          "model": "Qwen3.8 2.4T A95B",
          "modelId": "qwen/qwen3.8-2.4t-a95b",
          "why": "The same kind of Qwen model, as a file you can run yourself",
          "tasks": [
            "Run the large Qwen on your own machines",
            "When you use Max online and also want a copy you control",
            "The large downloadable Qwen"
          ],
          "stale": false
        },
        {
          "model": "Qwen3.8 Omni Flash",
          "modelId": "qwen/qwen3.8-omni-flash",
          "why": "When Max is more than the task needs",
          "tasks": [
            "Fast coding help on Qwen",
            "A large number of tasks at Qwen's lower price",
            "Short tasks that include a picture"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "self-host-one-gpu",
      "job": "Run on your own computer",
      "model": "Qwen3.8 27B",
      "modelId": "qwen/qwen3.8-27b",
      "why": "Small enough to run on one graphics card with 24GB of memory, so the code stays on your machine",
      "tasks": [
        "Coding with Qwen on your own computer",
        "Code that is not allowed to leave the machine",
        "A model you can train further on your own files",
        "When paying per request is the wrong way to pay"
      ],
      "stale": false,
      "also": [
        {
          "model": "Llama 4 Scout",
          "modelId": "meta-llama/llama-4-scout",
          "why": "Meta's smaller Llama 4. It also reads pictures.",
          "tasks": [
            "Llama on your own computer, instead of Qwen",
            "When you already run Llama",
            "A lighter model for one machine"
          ],
          "stale": false
        },
        {
          "model": "Devstral 2",
          "modelId": "mistralai/devstral-2512",
          "why": "Mistral's downloadable model for coding tasks that run commands, if the graphics card has enough memory",
          "tasks": [
            "Coding tasks on your own computer",
            "When you want Mistral instead of Qwen",
            "Tasks that run commands, on a machine you control"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "long-context-open-coding",
      "job": "Very large projects",
      "model": "GLM 5.3",
      "modelId": "z-ai/glm-5.3",
      "why": "A downloadable model for working on a very large project in one request",
      "tasks": [
        "Edits across a big project, on a model you can download",
        "Long tasks you can run on your own machines",
        "Coding help without paying Claude's price",
        "When the project is too long for one request on other downloadable models"
      ],
      "stale": false,
      "also": [
        {
          "model": "Kimi K3",
          "modelId": "moonshotai/kimi-k3",
          "why": "Often the stronger downloadable model when the coding is hard",
          "tasks": [
            "Harder coding on Kimi",
            "When GLM is not finishing the task",
            "A downloadable model when you need a stronger result"
          ],
          "stale": false
        },
        {
          "model": "Mistral Medium 3.5",
          "modelId": "mistralai/mistral-medium-3-5",
          "why": "Mistral's online model, if you want that company instead of GLM",
          "tasks": [
            "Coding on Mistral",
            "Tasks that include a picture and text",
            "When you already pay for Mistral"
          ],
          "stale": false
        }
      ]
    }
  ]
};
