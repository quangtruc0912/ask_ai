"use client";
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Menu, MoveRight, X } from "lucide-react";
import { useState, useCallback, MouseEvent } from "react";

export const Header = () => {
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
    {
      title: "Support",
      href: "/support",
      description: "Get help and learn more.",
    },
  ];

  const [isOpen, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Helper to handle smooth scroll for hash links
  const handleNavClick = useCallback((e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const id = href.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  return (
    <header className="w-full z-40 fixed top-0 left-0 bg-background">
      <div className="container relative mx-auto min-h-20 flex gap-4 flex-row lg:grid lg:grid-cols-3 items-center">
        <div className="justify-start items-center gap-4 lg:flex hidden flex-row">
          <NavigationMenu className="flex justify-start items-start">
            <NavigationMenuList className="flex justify-start gap-4 flex-row">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.href ? (
                    <NavigationMenuLink asChild>
                      {item.href.startsWith("#") ? (
                        <a
                          href={item.href}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium"
                          onClick={(e) => handleNavClick(e, item.href)}
                        >
                          {item.title}
                        </a>
                      ) : (
                        <Button variant="ghost" asChild>
                          <a href={item.href}>{item.title}</a>
                        </Button>
                      )}
                    </NavigationMenuLink>
                  ) : (
                    <>
                      <NavigationMenuTrigger className="font-medium text-sm">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="!w-[450px] p-4">
                        <div className="flex flex-col lg:grid grid-cols-2 gap-4">
                          <div className="flex flex-col h-full justify-between">
                            <div className="flex flex-col">
                              <p className="text-base">{item.title}</p>
                              <p className="text-muted-foreground text-sm">
                                {item.description}
                              </p>
                            </div>
                            <Button size="sm" className="mt-10">
                              Book a call today
                            </Button>
                          </div>
                          <div className="flex flex-col text-sm h-full justify-end">
                            {item.items?.map((subItem) => (
                              <NavigationMenuLink asChild key={subItem.title}>
                                {subItem.href.startsWith("#") ? (
                                  <a
                                    href={subItem.href}
                                    className="flex flex-row justify-between items-center hover:bg-muted py-2 px-4 rounded"
                                    onClick={(e) => handleNavClick(e, subItem.href)}
                                  >
                                    <span>{subItem.title}</span>
                                    <MoveRight className="w-4 h-4 text-muted-foreground" />
                                  </a>
                                ) : (
                                  <a
                                    href={subItem.href}
                                    className="flex flex-row justify-between items-center hover:bg-muted py-2 px-4 rounded"
                                  >
                                    <span>{subItem.title}</span>
                                    <MoveRight className="w-4 h-4 text-muted-foreground" />
                                  </a>
                                )}
                              </NavigationMenuLink>
                            ))}
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </>
                  )}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex lg:justify-center">
          {/* <p className="font-semibold">AskIts Extension</p> */}
        </div>
        <div className="flex justify-end w-full gap-4">
          {!user ? (
            <>
              <div className="border-r hidden md:inline"></div>
              <Button variant="outline"  ><Link href="/login">Start Chatting</Link></Button>
            </>
          ) : (
            <>
              <div> {user.email}        <div className="hidden md:inline"></div>
                <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
              </div>
            </>
          )}
        </div>
        <div className="flex w-12 shrink lg:hidden items-end justify-end">
          <Button variant="ghost" onClick={() => setOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          {isOpen && (
            <div className="absolute top-20 border-t flex flex-col w-full right-0 bg-background shadow-lg py-4 container gap-8">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-2">
                    {item.href ? (
                      item.href.startsWith("#") ? (
                        <a
                          href={item.href}
                          className="flex justify-between items-center"
                          onClick={(e) => handleNavClick(e, item.href)}
                        >
                          <span className="text-lg">{item.title}</span>
                          <MoveRight className="w-4 h-4 stroke-1 text-muted-foreground" />
                        </a>
                      ) : (
                        <a
                          href={item.href}
                          className="flex justify-between items-center"
                        >
                          <span className="text-lg">{item.title}</span>
                          <MoveRight className="w-4 h-4 stroke-1 text-muted-foreground" />
                        </a>
                      )
                    ) : (
                      <p className="text-lg">{item.title}</p>
                    )}
                    {item.items &&
                      item.items.map((subItem) => (
                        subItem.href.startsWith("#") ? (
                          <a
                            key={subItem.title}
                            href={subItem.href}
                            className="flex justify-between items-center"
                            onClick={(e) => handleNavClick(e, subItem.href)}
                          >
                            <span className="text-muted-foreground">
                              {subItem.title}
                            </span>
                            <MoveRight className="w-4 h-4 stroke-1" />
                          </a>
                        ) : (
                          <a
                            key={subItem.title}
                            href={subItem.href}
                            className="flex justify-between items-center"
                          >
                            <span className="text-muted-foreground">
                              {subItem.title}
                            </span>
                            <MoveRight className="w-4 h-4 stroke-1" />
                          </a>
                        )
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};