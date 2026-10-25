import type { EventCategory } from "../../lib/event";

/** Niches map to the real event categories, so picking one filters real events. */
export type Niche = { key: string; label: string; icon: EventCategory; categories: EventCategory[]; why: string };
export const NICHES: Niche[] = [
  { key: "student", label: "Student", icon: "learning-hobbies", categories: ["learning-hobbies", "community-causes"], why: "Learning, workshops and community events" },
  { key: "family", label: "Community", icon: "community-causes", categories: ["community-causes", "festivals-other", "sports-outdoors"], why: "Community, festivals and outdoors; check each listing for age restrictions" },
  { key: "night", label: "Nightlife", icon: "music-nightlife", categories: ["music-nightlife"], why: "Music and nightlife; check each listing for age restrictions" },
  { key: "photo", label: "Photographer", icon: "arts-culture", categories: ["arts-culture", "sports-outdoors"], why: "Art, views and outdoor light" },
  { key: "foodie", label: "Foodie", icon: "food-drink", categories: ["food-drink", "markets-shopping"], why: "Eat your way through the city" },
  { key: "techie", label: "Techie", icon: "learning-hobbies", categories: ["learning-hobbies"], why: "Builders and hobbyists" },
  { key: "music", label: "Music lover", icon: "music-nightlife", categories: ["music-nightlife", "festivals-other"], why: "Live music and festivals" },
  { key: "art", label: "Art fan", icon: "arts-culture", categories: ["arts-culture"], why: "Galleries and culture" },
  { key: "pets", label: "Pet owner", icon: "community-causes", categories: ["community-causes", "sports-outdoors"], why: "Community and outdoors" },
  { key: "fashion", label: "Fashion", icon: "markets-shopping", categories: ["markets-shopping", "arts-culture"], why: "Markets and makers" },
  { key: "cars", label: "Car lover", icon: "festivals-other", categories: ["festivals-other", "markets-shopping"], why: "Shows and festivals" },
  { key: "outdoors", label: "Outdoors", icon: "sports-outdoors", categories: ["sports-outdoors"], why: "Fresh air and movement" },
  { key: "fitness", label: "Fitness", icon: "sports-outdoors", categories: ["sports-outdoors"], why: "Get moving" },
  { key: "gamer", label: "Gamer", icon: "learning-hobbies", categories: ["learning-hobbies", "festivals-other"], why: "Game nights and conventions" },
];

/** SAMPLE DATA ONLY. Shown with a "Sample" label; no accounts or social backend exists. */
export const SAMPLE_PEOPLE = [
  { id: "maya", name: "Maya", color: "#8CC8FF", interests: "Tech · Music" },
  { id: "jordan", name: "Jordan", color: "#FFB066", interests: "Food · Art" },
  { id: "priya", name: "Priya", color: "#FFD966", interests: "Family · Outdoors" },
  { id: "theo", name: "Theo", color: "#B79CFF", interests: "Music · Nightlife" },
  { id: "lena", name: "Lena", color: "#FF9AA8", interests: "Photography · Outdoors" },
  { id: "sam", name: "Sam", color: "#8EDDB0", interests: "Fitness · Outdoors" },
];
export const SAMPLE_NOTIFICATIONS = [
  { id: "n1", kind: "update", title: "Gallery Crawl was cancelled", sub: "Sample event update · organizers would post this" },
  { id: "n2", kind: "update", title: "Movie in the Park starts 1 hour later", sub: "Sample event update · new start time" },
  { id: "n3", kind: "follow", title: "Theo wants to follow you", sub: "Sample follow request", person: "theo" },
  { id: "n4", kind: "follow", title: "Lena wants to follow you", sub: "Sample follow request", person: "lena" },
];
export const SAMPLE_SPOTS = [
  { name: "Twin Peaks", sub: "Sunset views", from: "#FFB38A", to: "#B79CFF" },
  { name: "Lands End", sub: "Coastal trail", from: "#8CC8FF", to: "#FFD966" },
  { name: "Baker Beach", sub: "Golden Gate view", from: "#FF9AA8", to: "#FFD966" },
];
export const SAMPLE_MESSAGES: Record<string, [string, string][]> = {
  maya: [["them", "Are you going tonight?"], ["me", "Yes! What time should we meet?"], ["them", "Let's meet at 6"]],
  jordan: [["them", "That night market looks fun"], ["me", "Count me in!"]],
  priya: [["them", "Bringing the kids Saturday"]],
};
