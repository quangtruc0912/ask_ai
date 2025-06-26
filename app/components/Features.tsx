'use client'
import { Badge } from "@/components/ui/badge";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

export const Features = () => (
    <div className="w-full py-20 lg:py-40">
        <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 justify-end items-end  gap-10">
                <div className="flex gap-4 flex-col items-start">
                    <div>
                        <Badge>Extension Features</Badge>
                    </div>
                    <div className="flex gap-2 flex-col">
                        <h2 className="text-xl md:text-3xl lg:text-5xl tracking-tighter lg:max-w-xl font-regular text-left">
                            Unlock the Power of AI in Your Browser
                        </h2>
                        <p className="text-lg  max-w-xl lg:max-w-sm leading-relaxed tracking-tight text-muted-foreground  text-left">
                            Our Chrome extension brings advanced AI tools to your daily workflow: analyze cropped screenshots, generate or reply to messages, group conversations by topic, create effective prompts, and understand the purpose of LLMs. Use your own LLM API key (OpenAI, Anthropic, Gemini, and more) for unlimited access, or enjoy a free tier with limited requests.
                        </p>
                    </div>
                </div>
                <div className="w-full max-w-full px-6">
                    <Carousel>
                        <CarouselContent>
                            {[
                                'Analyze cropped screenshots instantly',
                                'Generate and reply to messages with AI',
                                'Group conversations by topic automatically',
                                'Prompt generation and suggestions',
                                'Understand LLM purpose and usage',
                                'Use your own LLM API key (OpenAI, Anthropic, Gemini, etc.) or enjoy free requests'
                            ].map((feature, index) => (
                                <CarouselItem key={index}>
                                    <div className="flex rounded-md aspect-video bg-muted items-center justify-center p-6">
                                        <span className="text-sm">
                                            {feature}
                                        </span>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                </div>
            </div>
        </div>
    </div>
);