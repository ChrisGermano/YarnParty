# YarnParty

Real-time word suggestions are randomly picked (influenced by suggestion popularity) on a steady interval to build social media posts, which are automatically shared.

Users enter words, duplication and case ignored, that are stored in a temporary word bank. When the interval timer reaches 0, the words are sorted by popularity and the most popular word is appended to a generated string.

# Server-side

App status is monitored by an object that contains user count, word bank, interval time remaining, interval length, current post content, and, until a database is integrated, an array of previous social posts.

## Elements
### users
The number of currently-connected users

### bank
An array of unique words nominated to be appended to the `nextTweet`

### secsLeft / resetTime
The number of seconds left until reset, and the total interval time in seconds

### nextTweet / pastTweets
A string constructed of words chosen from the wordBank, and an array of past constructed strings
