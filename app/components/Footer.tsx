'use client'
import Link from "next/link";

export const Footer = () => {
  const navigationItems = [
    {
      title: "Home",
      href: "/",
      description: "",
    },
    {
      title: "Features",
      description: "See what the AskIts Extension can do.",
      items: [
        {
          title: "Screenshot Analysis",
          href: "/features#screenshot",
        },
        {
          title: "Writing & Replies",
          href: "/features#writing",
        },
        {
          title: "Conversation Grouping",
          href: "/features#grouping",
        },
        {
          title: "Prompt Generation",
          href: "/features#prompt",
        },
        {
          title: "Multi-Model Support",
          href: "/features#models",
        },
      ],
    },
    {
      title: "Pricing",
      href: "/pricing",
      description: "Free tier and unlimited with your API key.",
    },
    // {
    //   title: "Support",
    //   href: "/support",
    //   description: "Get help and learn more.",
    // },
  ];

  return (
    <div className="w-full py-20 lg:py-40 bg-foreground text-background">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="flex gap-8 flex-col items-start">
            <div className="flex gap-2 flex-col">
              <h2 className="text-3xl md:text-5xl tracking-tighter max-w-xl font-regular text-left">
                AskIts Extension
              </h2>
              <p className="text-lg max-w-lg leading-relaxed tracking-tight text-background/75 text-left">
                Bring powerful AI tools to your browser with our Chrome extension. Supports OpenAI, Anthropic, Gemini, and more.
              </p>
            </div>
            <div className="flex gap-20 flex-row">
              {/* <div className="flex flex-col text-sm max-w-lg leading-relaxed tracking-tight text-background/75 text-left">
                <p>1 AI Avenue</p>
                <p>San Francisco</p>
                <p>CA 94105</p>
              </div> */}
              <div className="flex flex-col text-sm max-w-lg leading-relaxed tracking-tight text-background/75 text-left">
                <Link href="/terms">Terms of Service</Link>
                <Link href="/privacy">Privacy Policy</Link>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-10 items-start">
            {navigationItems.map((item) => (
              <div
                key={item.title}
                className="flex text-base gap-1 flex-col items-start"
              >
                <div className="flex flex-col gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex justify-between items-center"
                    >
                      <span className="text-xl">{item.title}</span>
                    </Link>
                  ) : (
                    <p className="text-xl">{item.title}</p>
                  )}
                  {item.items &&
                    item.items.map((subItem) => (
                      <Link
                        key={subItem.title}
                        href={subItem.href}
                        className="flex justify-between items-center"
                      >
                        <span className="text-background/75">
                          {subItem.title}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};