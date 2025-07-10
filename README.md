# 🎮 UNO Multiplayer Game

live - [UNO-PARTY](https://uno-party.vercel.app/uno/lucid)

A real-time multiplayer UNO card game built with Next.js and PartyKit. Play the classic card game with friends online with smooth animations and real-time synchronization.

![UNO Game](public/uno.svg)

## ✨ Features

### 🎯 Game Features

- **Real-time Multiplayer**: Play with 2-5 players simultaneously
- **Official UNO Rules**: Complete implementation of all UNO card types and rules
- **Smooth Animations**: Card dealing, playing, and drawing animations
- **Turn-based Gameplay**: Proper turn management with visual indicators
- **UNO Call System**: Don't forget to call UNO or face penalty cards!
- **Game State Management**: Host controls for starting, ending, and resetting games

### 🎨 UI/UX Features

- **Modern Design**: Clean, responsive interface with gradient backgrounds
- **Card Animations**: Flip, slide, and dealing animations for engaging gameplay
- **Visual Feedback**: Clear indicators for current turn, game status, and actions
- **Mobile Responsive**: Play on desktop, tablet, or mobile devices
- **Accessibility**: Screen reader support and keyboard navigation

### 🔧 Technical Features

- **Real-time Sync**: WebSocket-based real-time game state synchronization
- **Room System**: Create and join game rooms with unique IDs
- **Player Management**: Handle player connections, disconnections, and room cleanup
- **Error Handling**: Comprehensive error messages and edge case handling
- **Type Safety**: Full TypeScript implementation for robust development

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- PartyKit account (for multiplayer backend)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd uno
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up PartyKit**

   - Create an account at [PartyKit](https://partykit.io)
   - Update the PartyKit URL in `app/uno/[room_id]/page.tsx`
   - Replace `uno-party.amanuela97.partykit.dev` with your PartyKit domain

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Start the PartyKit server**

   ```bash
   npx partykit dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 How to Play

### Game Setup

1. **Create a Room**: Enter a room ID and your player name
2. **Share the Room**: Send the room link to friends (up to 4 more players)
3. **Ready Up**: All players must click "Ready" before starting
4. **Start Game**: The host can start the game once everyone is ready

### Game Rules

- **Objective**: Be the first player to play all your cards
- **Card Matching**: Play cards that match the color or number of the top card
- **Action Cards**:
  - **Skip**: Next player loses their turn
  - **Reverse**: Changes the direction of play
  - **Draw Two**: Next player draws 2 cards and loses their turn
  - **Wild**: Change the color, can be played on any card
  - **Wild Draw Four**: Change color and next player draws 4 cards

### Special Rules

- **UNO Call**: When you have one card left, you MUST call UNO or draw 2 penalty cards
- **2-Player Games**: Reverse and Skip cards act the same (opponent loses turn)
- **Wild Draw Four**: Can only be played if you have no other matching cards

## 🛠️ Tech Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern, accessible component library
- **Lucide React**: Beautiful icons

### Backend

- **PartyKit**: Real-time multiplayer infrastructure
- **WebSocket**: Real-time communication
- **TypeScript**: Shared type definitions

### Development Tools

- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **PostCSS**: CSS processing

## 📁 Project Structure

```
uno/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles and animations
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── uno/               # Game pages
│       ├── page.tsx       # Create room page
│       └── [room_id]/     # Dynamic room pages
│           └── page.tsx   # Game room page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── JoinForm.tsx      # Player join form
│   └── Navbar.tsx        # Navigation with game rules
├── party/                # PartyKit server
│   ├── index.ts          # Main server logic
│   ├── types.ts          # Shared type definitions
│   └── util.ts           # Utility functions
├── public/               # Static assets
│   └── cards/            # Card SVG images
└── lib/                  # Utility libraries
    └── utils.ts          # Helper functions
```

## 🎮 Game Features in Detail

### Card Types

- **Number Cards** (0-9): Basic cards in four colors (Red, Yellow, Green, Blue)
- **Skip Cards**: Skip the next player's turn
- **Reverse Cards**: Reverse the direction of play
- **Draw Two Cards**: Next player draws 2 cards and loses turn
- **Wild Cards**: Change the current color
- **Wild Draw Four Cards**: Change color and next player draws 4 cards

### Animation System

- **Card Flip**: 3D flip animation when game starts
- **Card Draw**: Cards animate from deck to player hand
- **Card Play**: Cards slide toward the discard pile
- **Card Deal**: Smooth dealing animation for new cards

### Room Management

- **Host Controls**: First player has admin privileges
- **Player Limits**: Maximum 5 players per room
- **Connection Handling**: Automatic cleanup when players disconnect
- **Game State Sync**: Real-time updates for all players

## 🚀 Deployment

### PartyKit Deployment

1. **Deploy the PartyKit server**

   ```bash
   npx partykit deploy
   ```

2. **Update the frontend configuration**
   - Replace the PartyKit URL in the frontend code
   - Use your deployed PartyKit domain

### Frontend Deployment

Deploy to Vercel, Netlify, or any other hosting platform that supports Next.js.

**Vercel Deployment:**

1. Connect your GitHub repository to Vercel
2. Deploy automatically on every push
3. Update environment variables if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Acknowledgments

- UNO card game by Mattel
- PartyKit for real-time multiplayer infrastructure
- shadcn/ui for beautiful, accessible components
- Next.js team for the amazing framework

## 🐛 Known Issues

- None currently! Feel free to report any bugs you find.

## 🔮 Future Enhancements

- [ ] Spectator mode
- [ ] Game statistics and leaderboards
- [ ] Custom card themes
- [ ] Sound effects
- [ ] Tournament mode
- [ ] AI players

---

**Made with ❤️ and lots of ☕**

_Have fun playing UNO with your friends!_ 🎮
