# FB Share Tool

A web-based tool for automated Facebook post sharing with a clean, modern UI.

## Features

- **Automatic Token Retrieval**: Securely get your Facebook access token
- **Customizable Sharing**: Choose how many times to share a post (10, 50, 100, 1000, or custom)
- **Real-time Progress**: Monitor sharing progress with a visual progress bar
- **Console Output**: View detailed logs of the sharing process
- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd fb-share-tool
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. **Get Access Token**:
   - Enter your Facebook username/ID and password
   - Click "Get Token"

2. **Configure Sharing**:
   - Enter the URL you want to share
   - Select the number of shares (10, 50, 100, 1000, maximum, or custom)
   - Set the time interval between shares (minimum 1000ms recommended)
   - Click "Start Sharing"

3. **Monitor Progress**:
   - Watch the progress bar and console output
   - You can stop the sharing process at any time

## Technical Details

- Built with Node.js and Express
- Uses the Facebook Graph API for sharing
- Implements a client-server architecture for better security
- Token retrieval via secure API endpoint

## Security Notes

- Your Facebook credentials are only used to obtain an access token and are not stored
- All sharing is done server-side for improved reliability
- Posts are shared with "SELF" privacy setting (only visible to you)

## License

MIT 