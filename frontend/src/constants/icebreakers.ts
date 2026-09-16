export const CONVERSATION_STARTERS = [
    "🎯 Icebreaker: Would you rather explore space or the deep ocean?",
    "🎯 Icebreaker: What's the last show you binge-watched?",
    "🎯 Icebreaker: If you could live in any country, where would you go?",
    "🎯 Icebreaker: What's your most controversial food opinion?",
    "🎯 Icebreaker: Would you rather have no internet for a week or no phone?",
    "🎯 Icebreaker: What skill do you wish you had?",
    "🎯 Icebreaker: Are you a morning person or a night owl?",
    "🎯 Icebreaker: What's the best piece of advice you've ever received?",
    "🎯 Icebreaker: If you could meet anyone from history, who would it be?",
    "🎯 Icebreaker: What's something you're surprisingly good at?",
    "🎯 Icebreaker: What's your favorite travel destination so far?",
    "🎯 Icebreaker: If you had 24 hours with no obligations, what would you do?",
];

export function getRandomStarter(): string {
    return CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
}
