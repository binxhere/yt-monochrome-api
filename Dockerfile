FROM oven/bun:latest

# Install Node.js (required by yt-dlp for signature extraction)
RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the portable app files
COPY package.json youtube-server.js yt-dlp_linux ./

# Ensure the binary is executable
RUN chmod +x yt-dlp_linux

EXPOSE 3006

CMD ["bun", "run", "start"]
