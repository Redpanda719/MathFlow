export const GAME_LIBRARY = [
    {
        id: 'math-nitro',
        title: 'Math Nitro',
        subtitle: 'Race by solving fast',
        description: 'Nitro Type style racing with multiplication prompts, AI racers, and LAN races with synchronized countdowns and live scoreboards.',
        rules: [
            'Correct answers boost speed and distance.',
            'Wrong answers apply slowdown penalties.',
            'Finish by prompt count or race timer depending on track.'
        ],
        tags: ['easy', 'medium', 'hard', 'custom'],
        accent: '#00b894'
    },
    {
        id: 'math-tower-defense',
        title: 'Math Tower Defense',
        subtitle: 'Real TD + Math Energy',
        description: 'Place towers on build pads, manage waves, and trigger energy abilities. Math fuels your special actions while towers auto-fight.',
        rules: [
            'Drag tower cards onto build pads to place defenses.',
            'Earn GOLD from kills and ENERGY from math prompts.',
            'Survive wave bosses and protect the base core.'
        ],
        tags: ['easy', 'medium', 'hard'],
        accent: '#0984e3'
    },
    {
        id: 'math-io-serpents',
        title: 'Math.io Serpents',
        subtitle: 'Snake.io-style arena',
        description: 'Continuous arena snake battles with AI/LAN opponents, pellets, boosts, cut-offs, and math-powered abilities.',
        rules: [
            'Steer continuously, collect pellets, and outplay opponents.',
            'Head into any body = death burst into pellets.',
            'Solve quick math cards to recharge Boost/Shield/Magnet.'
        ],
        tags: ['easy', 'medium', 'hard', 'custom'],
        accent: '#26c281'
    }
];
export const GAME_BY_ID = Object.fromEntries(GAME_LIBRARY.map((game) => [game.id, game]));
