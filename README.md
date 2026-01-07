# OBS Reactions

A lightweight web application that displays animated emoji reactions for live streaming overlays. Perfect for streamers who want to show real-time viewer engagement through floating emoji animations.

## What It Does

**OBS Reactions** creates an interactive streaming experience with three components:

- **Overlay Page**: Displays animated emoji reactions floating up from the bottom of your stream
- **Control Page**: Mobile-friendly interface where viewers can send reactions by tapping emoji buttons
- **QR Code Page**: Generates a scannable QR code linking to the control page for easy viewer access

Reactions appear instantly on the overlay with smooth animations, and built-in spam prevention keeps things manageable.

## Features

- **Real-time Reactions**: Instant emoji animations using Momento Topics messaging
- **Live Reaction Counts**: QR page displays running totals of all reactions sent
- **Reset Functionality**: Manually reset reaction counts via Momento Topics
- **OBS Integration**: Transparent overlay perfect for streaming software
- **Mobile Optimized**: Touch-friendly control interface for viewers
- **Spam Prevention**: 3-second cooldown per user prevents overwhelming animations
- **Session Management**: Unique session IDs isolate different streams
- **6 Emoji Types**: Heart ❤️, 100 💯, Thumbs Up 👍, Clap 👏, Fire 🔥, Mind Blown 🤯

## Quick Start

### 1. Environment Setup

Copy the example environment file and add your Momento credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Momento configuration:
```
VITE_MOMENTO_API_KEY=your_momento_api_key_here
VITE_MOMENTO_ENDPOINT=your_momento_endpoint_here
```

### 2. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Usage

- **Overlay**: Navigate to `http://localhost:5173/your-session-id`
- **Control**: Navigate to `http://localhost:5173/reactions/your-session-id`
- **QR Code**: Navigate to `http://localhost:5173/qr/your-session-id`

Replace `your-session-id` with any unique identifier for your stream.

#### QR Code for Easy Access

The QR page generates a scannable QR code that links directly to your control page. Perfect for:
- Displaying on screen for viewers to scan
- Sharing the reaction interface without typing URLs
- Quick mobile access during live streams

**Live Reaction Counts**: The QR page also displays real-time counts of all reactions sent during the session, showing viewers the total engagement for each emoji type.

**Resetting Counts**: You can reset all reaction counts to zero by publishing any message to the "reset" topic in Momento. This is useful for:
- Starting fresh for new stream segments
- Clearing counts between different activities
- Resetting after testing or setup

## OBS Setup Guide

### Adding the Overlay to OBS

1. **Add Browser Source**
   - In OBS, click the `+` in your Sources panel
   - Select "Browser Source"
   - Name it "Reactions Overlay" (or whatever you prefer)

2. **Configure Browser Source**
   - **URL**: `https://your-domain.com/your-session-id` (or localhost during development)
   - **Width**: `1920` (match your canvas resolution)
   - **Height**: `1080` (match your canvas resolution)
   - **Custom CSS**: Leave blank
   - **Shutdown source when not visible**: Unchecked
   - **Refresh browser when scene becomes active**: Unchecked

3. **Position and Layer**
   - The overlay has a transparent background and will layer over your content
   - Position it above your main content sources in the source list
   - Reactions will animate from bottom to top across the entire screen

### Sharing with Viewers

#### Option 1: QR Code (Recommended)
1. **Add QR Code Browser Source**
   - Add another Browser Source named "QR Code"
   - **URL**: `https://your-domain.com/qr/your-session-id`
   - **Width**: `400`
   - **Height**: `400`
   - Position it in a corner of your stream

2. **Tell Viewers**: "Scan the QR code to send reactions!"

#### Option 2: Share URL Directly
- Share the control URL in chat: `https://your-domain.com/reactions/your-session-id`
- Add it to your stream description or panels

### Pro Tips

- **Test First**: Always test the overlay before going live
- **Unique Session IDs**: Use different session IDs for different streams
- **Mobile Friendly**: The control page works great on phones and tablets
- **Transparent Background**: The overlay won't interfere with your content
- **Performance**: Browser sources use minimal CPU when properly configured

### Troubleshooting OBS Issues

**Overlay Not Showing Reactions:**
- Check that the URL is correct and accessible
- Verify your Momento configuration is working
- Try refreshing the browser source (right-click → Refresh)

**QR Code Not Displaying:**
- Ensure the QR URL path includes `/qr/` before your session ID
- Check browser source dimensions (400x400 recommended)

**Performance Issues:**
- Reduce browser source resolution if needed
- Ensure "Shutdown source when not visible" is unchecked
- Close other unnecessary browser sources

## Deployment

### AWS Deployment (Recommended)

Deploy to AWS S3 + CloudFront using the included SAM template:

```bash
# Build and deploy
npm run build:deploy
```

The deployment creates:
- S3 bucket for static hosting
- CloudFront distribution for global delivery
- Proper security configurations

### Manual Deployment

For other hosting providers:

```bash
# Build for production
npm run build

# Deploy the 'dist' folder to your hosting service
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AnimatedEmoji/   # Individual emoji animation
│   ├── ReactionButton/  # Control page buttons
│   └── ErrorBoundary/   # Error handling
├── pages/              # Main application pages
│   ├── OverlayPage/    # OBS overlay display
│   ├── ControlPage/    # Mobile control interface
│   └── QRPage/         # QR code generator for easy access
├── services/           # External service integrations
│   └── MomentoService/ # Real-time messaging
├── types/              # TypeScript definitions
└── utils/              # Helper functions
```

## How It Works

1. **Session Creation**: Each stream gets a unique session ID in the URL
2. **QR Code Generation**: Display the QR page on stream for viewers to scan and access reactions
3. **Real-time Messaging**: Momento Topics handles instant communication between pages
4. **Live Counting**: QR page tracks and displays running totals of all reactions
5. **Animation System**: CSS animations with JavaScript positioning create smooth effects
6. **Spam Prevention**: Local storage tracks cooldowns per user to prevent abuse
7. **OBS Integration**: Transparent overlay page works seamlessly with streaming software
8. **Reset Control**: Publish to "reset" topic to clear all reaction counts instantly

## Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_MOMENTO_API_KEY` | Momento authentication token | Yes | `eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9...` |
| `VITE_MOMENTO_ENDPOINT` | Momento service endpoint | Yes | `https://api.cache.cell-4-us-west-2-1.prod.a.momentohq.com` |
| `VITE_MOMENTO_CACHE_NAME` | Momento cache name for your project | Yes | `my-reactions-cache` |
| `VITE_EVENT_NAME` | Display name for your event/stream | No | `My Awesome Stream` |
| `VITE_PRIMARY_COLOR` | Primary brand color (hex) | No | `#15381F` |
| `VITE_SECONDARY_COLOR` | Secondary brand color (hex) | No | `#05C88C` |
| `VITE_TERTIARY_COLOR` | Accent color (hex) | No | `#C4F135` |

#### Getting Momento Credentials

1. Sign up at [Momento Console](https://console.gomomento.com/)
2. Create a new cache for your project
3. Generate an API key with Topics permissions
4. Copy the API key and endpoint URL to your `.env` file

#### Complete .env.example

```bash
# Momento Configuration
# Get these values from your Momento Console (https://console.gomomento.com/)
VITE_MOMENTO_API_KEY=your_momento_api_key_here
VITE_MOMENTO_ENDPOINT=your_momento_endpoint_here
VITE_MOMENTO_CACHE_NAME=your_cache_name_here

# Branding (Optional)
# Customize the appearance of your reaction interface
VITE_EVENT_NAME=Your Event Name
VITE_PRIMARY_COLOR=#15381F
VITE_SECONDARY_COLOR=#05C88C
VITE_TERTIARY_COLOR=#C4F135
```

### Customization

- **Animation Duration**: Modify CSS in `AnimatedEmoji.module.css`
- **Cooldown Time**: Update `COOLDOWN_DURATION` in `CooldownManager.ts`
- **Emoji Set**: Edit `EMOJI_MAP` in `types/reactions.ts`

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code style
npm run deploy       # Deploy to AWS
```

### Testing

The project uses both unit tests and property-based testing:

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch
```

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: CSS Modules for component isolation
- **Real-time**: Momento Topics with long polling
- **Testing**: Vitest + React Testing Library + fast-check
- **Deployment**: AWS SAM (S3 + CloudFront)

## Browser Support

- Modern browsers with ES2020+ support
- Mobile Safari and Chrome for control interface
- OBS Browser Source for overlay display

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details
