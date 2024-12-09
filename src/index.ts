#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getTranscript, getVideoMetadata } from './youtube.js';

// Schema definitions
const YoutubeTranscriptSchema = z.object({
  url: z.string(),
  language: z.string().optional(),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: 'mcp-youtube',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'download_youtube_url',
      description: 'Download YouTube video transcript and metadata',
      inputSchema: zodToJsonSchema(YoutubeTranscriptSchema) as ToolInput,
    },
  ];

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'download_youtube_url': {
        const parsed = YoutubeTranscriptSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(
            `Invalid arguments for download_youtube_url: ${parsed.error}`,
          );
        }

        try {
          const [transcript, metadata] = await Promise.all([
            getTranscript(parsed.data.url, { language: parsed.data.language }),
            getVideoMetadata(parsed.data.url),
          ]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  title: metadata.title,
                  description: metadata.description,
                  transcript,
                }),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `YouTube API Error: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP YouTube Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
