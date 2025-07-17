'use client'
import { Badge } from "@/components/ui/badge";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

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
                                {
                                    src: "/features/1.png",
                                    alt: "Organizes user conversation",
                                    caption: "Organizes user conversation"
                                },
                                {
                                    src: "/features/2.png",
                                    alt: "Enhances responses by integrating tools",
                                    caption: "Enhances responses by integrating live web search results"
                                },
                                {
                                    src: "/features/3.png",
                                    alt: "Provides a customizable library of prompts for different use cases",
                                    caption: "Provides a customizable library of prompts for different use cases"
                                },
                                {
                                    src: "/features/4.png",
                                    alt: "Enables users to integrate their own API keys for chat access or use monthly free quota",
                                    caption: "Enables users to integrate their own API keys for chat access use monthly free quota"
                                }
                            ].map((feature, index) => (
                                <CarouselItem key={index}>
                                    <div className="flex flex-col rounded-md aspect-video bg-muted items-center justify-center p-6">
                                        <Image
                                            src={feature.src}
                                            alt={feature.alt}
                                            width={640}
                                            height={360}
                                            className="rounded mb-4 object-contain w-[640px] h-[360px]"
                                        />
                                        <span className="text-sm text-center text-primary">
                                            {feature.caption}
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