#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');

// Terminal ANSI Escape Colors & Formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightGreen: '\x1b[92m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  brightYellow: '\x1b[93m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  fgBlack: '\x1b[30m'
};

const TOPICS = {
  top: { name: 'Top Stories', url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
  world: { name: 'World', url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en' },
  technology: { name: 'Technology', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en' },
  tech: { name: 'Technology', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en' },
  business: { name: 'Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en' },
  science: { name: 'Science', url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en' },
  health: { name: 'Health', url: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en' },
  sports: { name: 'Sports', url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en' },
  entertainment: { name: 'Entertainment', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en' }
};

// Decodes common HTML entities
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

// Parses Google News RSS XML cleanly with Regex
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    
    let rawTitle = titleMatch ? titleMatch[1] : 'No Title';
    let source = sourceMatch ? decodeEntities(sourceMatch[1]) : '';
    
    // Strip trailing source name from title if it matches "- Source"
    let cleanTitle = decodeEntities(rawTitle);
    if (source && cleanTitle.endsWith(` - ${source}`)) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - (source.length + 3)).trim();
    }
    
    items.push({
      title: cleanTitle,
      link: linkMatch ? linkMatch[1].trim() : '',
      pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
      source: source || 'Google News'
    });
  }
  
  return items;
}

// Calculates relative time ago
function getRelativeTime(pubDateStr) {
  const date = new Date(pubDateStr);
  if (isNaN(date.getTime())) return pubDateStr;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Fetch news from URL
async function fetchNews(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const xml = await response.text();
    return parseRSS(xml);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}Error fetching news:${colors.reset}`, error.message);
    return [];
  }
}

// Print Help Menu
function printHelp() {
  console.log(`
${colors.bold}${colors.brightBlue}Google News CLI Tool${colors.reset} - Latest news in your terminal

${colors.bold}Usage:${colors.reset}
  google-news [options]
  google-news <topic>
  google-news <search-query>

${colors.bold}Options:${colors.reset}
  -t, --topic <topic>    Fetch news for a specific topic (world, tech, business, science, health, sports, entertainment)
  -s, --search <query>   Search Google News for articles matching the query
  -l, --limit <number>   Limit the number of articles displayed (default: 10)
  -h, --help             Show this help message

${colors.bold}Examples:${colors.reset}
  ./google-news --topic technology
  ./google-news --search "artificial intelligence"
  ./google-news -l 5
  ./google-news science
`);
}

// Show a clean, well-formatted news list
function displayArticles(articles, limit, sourceHeader) {
  if (articles.length === 0) {
    console.log(`\n${colors.yellow}No news articles found.${colors.reset}\n`);
    return;
  }

  const displayedArticles = articles.slice(0, limit);
  console.log(`\n${colors.bold}${colors.brightBlue}=== ${sourceHeader} ===${colors.reset}\n`);
  
  displayedArticles.forEach((art, index) => {
    const num = String(index + 1).padStart(2, ' ');
    const relativeTime = getRelativeTime(art.pubDate);
    
    console.log(`${colors.brightCyan}${num}.${colors.reset} ${colors.bold}${art.title}${colors.reset}`);
    console.log(`    ${colors.dim}Source:${colors.reset} ${colors.brightYellow}${art.source}${colors.reset}  ${colors.dim}|  Published:${colors.reset} ${colors.green}${relativeTime}${colors.reset}`);
    console.log(`    ${colors.dim}Link:${colors.reset} ${colors.blue}${colors.underline}${art.link}${colors.reset}\n`);
  });
}

// Opens the specified article link in the default browser
function openBrowser(link) {
  if (!link) return;
  const command = process.platform === 'darwin' ? `open "${link}"` : 
                  process.platform === 'win32' ? `start "${link}"` : 
                  `xdg-open "${link}"`;
                  
  exec(command, (err) => {
    if (err) {
      console.log(`${colors.red}Failed to open browser: ${err.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}Opening article in browser...${colors.reset}`);
    }
  });
}

// Interactive CLI main function
async function interactiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const prompt = (query) => new Promise(resolve => rl.question(query, resolve));

  while (true) {
    console.clear();
    console.log(`${colors.bold}${colors.brightBlue}┌────────────────────────────────────────┐`);
    console.log(`│         GOOGLE NEWS TERMINAL           │`);
    console.log(`└────────────────────────────────────────┘${colors.reset}`);
    console.log(`\n${colors.bold}Select a Topic to browse:${colors.reset}\n`);
    console.log(`  ${colors.brightCyan}1.${colors.reset} Top Stories`);
    console.log(`  ${colors.brightCyan}2.${colors.reset} World`);
    console.log(`  ${colors.brightCyan}3.${colors.reset} Technology`);
    console.log(`  ${colors.brightCyan}4.${colors.reset} Business`);
    console.log(`  ${colors.brightCyan}5.${colors.reset} Science`);
    console.log(`  ${colors.brightCyan}6.${colors.reset} Health`);
    console.log(`  ${colors.brightCyan}7.${colors.reset} Sports`);
    console.log(`  ${colors.brightCyan}8.${colors.reset} Entertainment`);
    console.log(`  ${colors.brightCyan}s.${colors.reset} Search Custom Query`);
    console.log(`  ${colors.brightCyan}q.${colors.reset} Exit`);
    
    const choice = (await prompt(`\n${colors.bold}Choice (1-8, s, q): ${colors.reset}`)).trim().toLowerCase();
    
    if (choice === 'q') {
      console.log(`\nGoodbye!\n`);
      rl.close();
      break;
    }
    
    let url = '';
    let header = '';
    
    if (choice === '1') { url = TOPICS.top.url; header = 'Top Stories'; }
    else if (choice === '2') { url = TOPICS.world.url; header = 'World News'; }
    else if (choice === '3') { url = TOPICS.technology.url; header = 'Technology News'; }
    else if (choice === '4') { url = TOPICS.business.url; header = 'Business News'; }
    else if (choice === '5') { url = TOPICS.science.url; header = 'Science News'; }
    else if (choice === '6') { url = TOPICS.health.url; header = 'Health News'; }
    else if (choice === '7') { url = TOPICS.sports.url; header = 'Sports News'; }
    else if (choice === '8') { url = TOPICS.entertainment.url; header = 'Entertainment News'; }
    else if (choice === 's') {
      const searchQuery = (await prompt(`\nEnter search query: ${colors.reset}`)).trim();
      if (!searchQuery) continue;
      url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
      header = `Search Results: "${searchQuery}"`;
    } else {
      await prompt(`\n${colors.red}Invalid option. Press Enter to continue...${colors.reset}`);
      continue;
    }
    
    console.log(`\n${colors.dim}Fetching news...${colors.reset}`);
    const articles = await fetchNews(url);
    const limit = 10;
    
    while (true) {
      console.clear();
      displayArticles(articles, limit, header);
      
      const subChoice = (await prompt(`${colors.bold}Enter number to open article, 'm' for main menu, 'q' to quit: ${colors.reset}`)).trim().toLowerCase();
      
      if (subChoice === 'm') {
        break;
      } else if (subChoice === 'q') {
        console.log(`\nGoodbye!\n`);
        rl.close();
        return;
      } else {
        const artIndex = parseInt(subChoice, 10) - 1;
        if (artIndex >= 0 && artIndex < articles.length && artIndex < limit) {
          openBrowser(articles[artIndex].link);
          await prompt(`\nPress Enter to return to news list...`);
        } else {
          await prompt(`\n${colors.red}Invalid input. Press Enter to retry...${colors.reset}`);
        }
      }
    }
  }
}

// Command Line Argument Handling
async function main() {
  const args = process.argv.slice(2);
  let topic = null;
  let searchQuery = null;
  let limit = 10;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' || args[i] === '-t') {
      topic = args[i+1];
      i++;
    } else if (args[i] === '--search' || args[i] === '-s') {
      searchQuery = args[i+1];
      i++;
    } else if (args[i] === '--limit' || args[i] === '-l') {
      limit = parseInt(args[i+1], 10) || 10;
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  // Positional fallback
  if (args.length > 0 && !topic && !searchQuery) {
    const argJoined = args.filter(a => !a.startsWith('-')).join(' ');
    if (argJoined) {
      const possibleTopic = argJoined.toLowerCase().trim();
      if (TOPICS[possibleTopic]) {
        topic = possibleTopic;
      } else {
        searchQuery = argJoined;
      }
    }
  }
  
  // If arguments are provided, execute and output directly
  if (topic || searchQuery) {
    let url = '';
    let header = '';
    
    if (topic) {
      const topicInfo = TOPICS[topic.toLowerCase()];
      if (!topicInfo) {
        console.error(`\n${colors.red}Unknown topic: ${topic}${colors.reset}`);
        console.error(`Available topics: world, technology, business, science, health, sports, entertainment`);
        process.exit(1);
      }
      url = topicInfo.url;
      header = `${topicInfo.name} News`;
    } else {
      url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
      header = `Search Results: "${searchQuery}"`;
    }
    
    const articles = await fetchNews(url);
    displayArticles(articles, limit, header);
    
    // Quick prompt to open an article if desired
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const prompt = (query) => new Promise(resolve => rl.question(query, resolve));
    
    const choice = (await prompt(`${colors.bold}Enter index to open article in browser (or Enter to exit): ${colors.reset}`)).trim();
    if (choice) {
      const idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < articles.length && idx < limit) {
        openBrowser(articles[idx].link);
      } else {
        console.log(`${colors.red}Invalid index.${colors.reset}`);
      }
    }
    rl.close();
  } else {
    // Run Interactive mode
    interactiveCLI();
  }
}

main();
