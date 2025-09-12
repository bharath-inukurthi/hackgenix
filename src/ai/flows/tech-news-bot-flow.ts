'use server';

/**
 * @fileOverview A chatbot that provides the latest tech news.
 *
 * - techNewsBot - A function that handles the chatbot interaction.
 * - TechNewsBotInput - The input type for the techNewsBot function.
 * - TechNewsBotOutput - The return type for the techNewsBot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TechNewsBotInputSchema = z.object({
  query: z.string().describe("The user's question about tech news."),
});
export type TechNewsBotInput = z.infer<typeof TechNewsBotInputSchema>;

const NewsItemSchema = z.object({
    title: z.string().describe('The headline of the news article.'),
    summary: z.string().describe('A brief summary of the news article.'),
    source: z.string().optional().describe('The source of the news (e.g., The Verge, TechCrunch).'),
    url: z.string().optional().describe('The direct URL to the full news article.'),
});

const TechNewsBotOutputSchema = z.object({
  intro: z.string().describe("A friendly introductory sentence before listing the news items."),
  news: z.array(NewsItemSchema).describe("A list of the latest tech news articles related to the user's query."),
});
export type TechNewsBotOutput = z.infer<typeof TechNewsBotOutputSchema>;

export async function techNewsBot(input: TechNewsBotInput): Promise<TechNewsBotOutput> {
  return techNewsBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'techNewsBotPrompt',
  input: {schema: TechNewsBotInputSchema},
  output: {schema: TechNewsBotOutputSchema},
  prompt: `You are "Techie," a friendly and knowledgeable AI chatbot expert on the latest technology news.
Your role is to provide users with concise and accurate updates on what's happening in the tech world.
Based on the user's query, search for articles/news on Google and provide a list of items.
For each news item, include the title, a brief summary, the source name, and the direct URL to the article.
If the direct URL is not available, provide a Google search URL for the article title.
At the bottom of each news item, clearly mention the source where you referred the information from.
Ensure the URLs are real and functional.
Start with a friendly introductory sentence.

User query: {{{query}}}`,
});

const techNewsBotFlow = ai.defineFlow(
  {
    name: 'techNewsBotFlow',
    inputSchema: TechNewsBotInputSchema,
    outputSchema: TechNewsBotOutputSchema,
  },
  async input => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('NEWS_API_KEY not found in environment variables');
    }
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(input.query)}&language=en&sortBy=relevancy&apiKey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error('Failed to fetch news');
    }

    const news = data.articles.slice(0, 5).map((article: any) => ({
      title: article.title,
      summary: article.description || 'No summary available.',
      source: article.source.name,
      url: article.url,
    }));

    return {
      intro: "Here are the latest tech news related to your query:",
      news,
    };
  }
);