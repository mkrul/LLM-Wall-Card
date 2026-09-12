window.CARD = {
  "updatedAt": "2026-09-12T08:22:33-04:00",
  "source": "openrouter",
  "jobs": [
    {
      "id": "brainstorming",
      "job": "Brainstorming",
      "model": "Claude Opus 5",
      "modelId": "anthropic/claude-opus-5",
      "why": "Names, pitches, and half-formed product ideas",
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
            "Fast brainstorm dumps",
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
      "why": "Hardest coding and reasoning, when a miss costs hours",
      "tasks": [
        "Gnarly bugs that already ate an afternoon",
        "Hard multi-file refactors",
        "Long proofs and tricky reasoning",
        "Work where a wrong turn costs hours"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Opus 5",
          "modelId": "anthropic/claude-opus-5",
          "why": "Same class of work at a lower price",
          "tasks": [
            "Hard coding without Fable prices",
            "Long design-and-implement sessions",
            "Careful big diffs"
          ],
          "stale": false
        },
        {
          "model": "GPT-5.6 Sol",
          "modelId": "openai/gpt-5.6-sol",
          "why": "If the hard part is driving tools, not the prose",
          "tasks": [
            "Terminal-heavy debugging",
            "Tool-driven agent loops",
            "Hard problems that are mostly execution"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "architecture",
      "job": "Architecture",
      "model": "Claude Opus 5",
      "modelId": "anthropic/claude-opus-5",
      "why": "System design and refactors across many files",
      "tasks": [
        "System design from a blank page",
        "Refactors that touch many files",
        "API and module boundaries",
        "Explaining a messy codebase"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Fable 5.1",
          "modelId": "anthropic/claude-fable-5.1",
          "why": "High-stakes design that is easy to get wrong",
          "tasks": [
            "Irreversible architecture calls",
            "Migrations you cannot unwind",
            "Design reviews that have to be right"
          ],
          "stale": false
        },
        {
          "model": "Claude Sonnet 5",
          "modelId": "anthropic/claude-sonnet-5",
          "why": "Smaller structural changes you want back fast",
          "tasks": [
            "Small module splits",
            "Local restructuring",
            "Quick second opinions"
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
          "model": "Claude Opus 5",
          "modelId": "anthropic/claude-opus-5",
          "why": "When the change spans more of the codebase",
          "tasks": [
            "Cross-cutting features",
            "Edits that need more context",
            "Reviews of large diffs"
          ],
          "stale": false
        },
        {
          "model": "Gemini 3.8 Flash",
          "modelId": "google/gemini-3.8-flash",
          "why": "Cheap bulk edits and first drafts",
          "tasks": [
            "Boilerplate and first drafts",
            "Mechanical find-and-replace work",
            "Cheap first-pass reviews"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "agents-and-tools",
      "job": "Agents and tools",
      "model": "GPT-5.6 Sol",
      "modelId": "openai/gpt-5.6-sol",
      "why": "Long agent runs that drive the terminal and tools",
      "tasks": [
        "Agents that run shell commands",
        "Multi-step tool loops",
        "Repo-wide coding agents",
        "Work that fails if the model will not drive tools"
      ],
      "stale": false,
      "also": [
        {
          "model": "Grok 4.6",
          "modelId": "x-ai/grok-4.6",
          "why": "The same loop at a much lower price",
          "tasks": [
            "Long agent loops on a budget",
            "Background coding agents",
            "Cheaper tool-heavy runs"
          ],
          "stale": false
        },
        {
          "model": "Claude Fable 5.1",
          "modelId": "anthropic/claude-fable-5.1",
          "why": "When the agent cannot afford a wrong step",
          "tasks": [
            "High-stakes autonomous edits",
            "Agents on production-adjacent code",
            "Long runs that must stay on the rails"
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
      "why": "Huge PDFs, transcripts, and files that overflow other models",
      "tasks": [
        "Huge PDFs and books",
        "Long transcripts and meeting dumps",
        "Many files in one pass",
        "Docs that overflow a smaller window"
      ],
      "stale": false,
      "also": [
        {
          "model": "Claude Opus 5",
          "modelId": "anthropic/claude-opus-5",
          "why": "Long docs when judgment matters more than window size",
          "tasks": [
            "Contracts and policy reads",
            "Judgment-heavy document review",
            "Long specs you have to interpret, not just scan"
          ],
          "stale": false
        },
        {
          "model": "Gemini 3.8 Flash",
          "modelId": "google/gemini-3.8-flash",
          "why": "Long docs you need processed cheap and fast",
          "tasks": [
            "Bulk summarization",
            "Extracting facts from long dumps",
            "Cheap first-pass reads"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "fast-cheap-work",
      "job": "Fast cheap work",
      "model": "Gemini 3.8 Flash",
      "modelId": "google/gemini-3.8-flash",
      "why": "High-volume drafts, summaries, and cheap multimodal work",
      "tasks": [
        "High-volume drafts and summaries",
        "Cheap image, PDF, and video reads",
        "Classification and extraction at scale",
        "First drafts you will edit anyway"
      ],
      "stale": false,
      "also": [
        {
          "model": "DeepSeek V4 Pro",
          "modelId": "deepseek/deepseek-v4-pro-0813",
          "why": "Cheap text and code when you do not need images",
          "tasks": [
            "Cheap coding volume",
            "Batch rewrites",
            "Text-only bulk work"
          ],
          "stale": false
        },
        {
          "model": "Claude Sonnet 5",
          "modelId": "anthropic/claude-sonnet-5",
          "why": "When cheap-and-fast still has to read well",
          "tasks": [
            "Drafts that still need good prose",
            "Customer-facing copy on a budget",
            "Reviews that cannot sound sloppy"
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
      "why": "Generate or edit an image from a prompt",
      "tasks": [
        "Generate an image from a prompt",
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
            "Tighter prompt following",
            "When Flash looks cheap or sloppy"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "cheap-long-runs",
      "job": "Cheap long runs",
      "model": "Grok 4.6",
      "modelId": "x-ai/grok-4.6",
      "why": "Long agent loops when frontier prices would add up",
      "tasks": [
        "Long agent loops you will run often",
        "Overnight or background coding agents",
        "Tool-heavy work that would be expensive on Opus or Fable"
      ],
      "stale": false,
      "also": [
        {
          "model": "DeepSeek V4 Pro",
          "modelId": "deepseek/deepseek-v4-pro-0813",
          "why": "Even cheaper if the run is mostly code",
          "tasks": [
            "Cheap code-only agent loops",
            "Bulk codegen",
            "When Grok is still more than you want to spend"
          ],
          "stale": false
        },
        {
          "model": "Gemini 3.8 Flash",
          "modelId": "google/gemini-3.8-flash",
          "why": "Cheap volume if it is not a long agent",
          "tasks": [
            "Short cheap loops",
            "High-volume tool calls",
            "When you need speed more than a long horizon"
          ],
          "stale": false
        }
      ]
    },
    {
      "id": "lowest-cost",
      "job": "Lowest cost",
      "model": "DeepSeek V4 Pro",
      "modelId": "deepseek/deepseek-v4-pro-0813",
      "why": "Coding and writing when price is the constraint",
      "tasks": [
        "Coding when price is the constraint",
        "Self-hosted or very cheap API work",
        "Drafts and rewrites at the floor price"
      ],
      "stale": false,
      "also": [
        {
          "model": "Gemini 3.8 Flash",
          "modelId": "google/gemini-3.8-flash",
          "why": "Cheapest when you also need images or huge context",
          "tasks": [
            "Cheap multimodal work",
            "Huge-context jobs on a budget",
            "Volume work that DeepSeek cannot see (images, video)"
          ],
          "stale": false
        },
        {
          "model": "Grok 4.6",
          "modelId": "x-ai/grok-4.6",
          "why": "Cheap long runs that still feel strong",
          "tasks": [
            "Cheap long agents",
            "When lowest-cost still needs to hold a long task",
            "Budget work that is more than a one-shot prompt"
          ],
          "stale": false
        }
      ]
    }
  ]
};
