# Inktella Reading Community

INKTELLA — Product & Development Brief
A book-centred social network for reviews, reading, and discovery
1. Product Overview
Product name: Inktella
Product category: Social reading platform and book review blogging network
Product inspiration: Letterboxd, adapted for books, with a stronger focus on long-form reviews and reviewer discovery.
Product vision: Build a network where books bring people together, readers publish meaningful reviews, and every book becomes a meeting place for hundreds of perspectives.
Inktella is not simply a book catalogue, reading tracker, or ratings website. It is a product-centred community in which every book has a dedicated page connecting its bibliographic information, independent reviews, reader discussions, community voting, and reading activity.
The book is the primary object. The reviewer is the creator. The community is the network.
2. Core Product Principles
Book-centred architecture: Every review, discussion, vote, and reading activity connects to a specific book.
Review freedom: Reviews are independent articles, not responses to a fixed questionnaire.
Meaningful writing: Full reviews must contain at least 100 words of substantive review content.
Low-friction participation: Reading status, voting, short thoughts, and discussions should require minimal effort.
Community-powered discovery: Readers help others discover books through their reviews, votes, shelves, and conversations.
Open catalogue contributions: Members can submit books using basic metadata without applying for author status.
Free community participation: Reading, writing reviews, voting, and maintaining reading shelves are free.
Independent opinions: Payment, sponsorship, and affiliate relationships must never buy favourable reviews or votes.


3. The Book Page — The Heart of Inktella
Every book has a permanent, canonical page. This page is the central destination for discovery, reading activity, reviews, and discussion.
Book information
Display:
Book cover
Title and subtitle
Author or authors
Synopsis
Publication year and publisher, where available
ISBN, where available
Genres and categories
Language and edition information, where available
Reading status controls
Community Recometer
Reader Consensus
Review and discussion counts
Use a book metadata provider to populate available information. Do not require users to manually enter information already available from a trusted source.
Where multiple editions exist, maintain a clear relationship between the work and its editions. Avoid creating duplicate book pages for different editions unless there is a meaningful reason to distinguish them.
Book page navigation
Use a clear set of tabs:
Overview — Book information, Recometer, Reader Consensus highlights, featured reviews, and recent activity.
Reviews — Full-length review articles from different members.
Short Thoughts — Brief reactions and opinions.
Discussion — Questions, replies, interpretations, and conversations.
Quotes — Brief passages shared by readers, with attribution and page references where available.
Reading Activity — Community activity related to the book, such as reading-status updates and newly published reviews.
The book page should make it easy to move between the book itself and the people writing about it.


4. Reviews — Independent Blog Articles
Reviews are the principal content type on Inktella.
A review is a standalone article attached to a book and authored by a member. It should read like a personal blog post, editorial review, or literary essay.
No fixed review template
Do not require structured sections such as:
Why I chose this book
My thoughts
Content warnings
Who I recommend this book to
Where to buy it
Reviewers decide their own structure and can include any of these elements if they wish.
Review editor
Provide a comfortable writing experience with:
Review title
Rich-text article body
Headings and subheadings
Paragraphs and lists
Bold and italic formatting
Hyperlinks
Draft saving
Preview before publication
Edit and delete controls
Optional cover or contextual images where permitted
Optional content-warning indicator
Optional personal rating
Optional external purchase or affiliate links
Do not build an unnecessarily complicated publishing editor. The goal is to make writing and publishing a thoughtful review straightforward.
Minimum word count
A full review must contain at least 100 words of substantive review content before publication.
Count the article body, excluding the title, metadata, and interface-generated text. Enforce the requirement on the server as well as in the interface.
Display a discreet word counter while writing. Explain the minimum when necessary, without interrupting the writing experience.
There should be no restrictive maximum word count beyond sensible technical limits.
Review distribution
Every published review must appear in:
Its associated book's Reviews tab
The author's public profile
The relevant following feed
Search and discovery results where appropriate
A review must have its own permanent URL and shareable page.
Review interactions
Support:
Likes
Comments and replies
Following the reviewer
Sharing the review
Reporting inappropriate content
Do not confuse a review's popularity with its quality. Provide editorially selected reviews and useful discovery mechanisms in addition to engagement-based sorting.
Optional review metadata
Ratings, content warnings, and affiliate links are optional metadata attached to the article. They must not become mandatory fields or fixed sections in the review body.


5. Short Thoughts
Short Thoughts are a separate content type for quick reactions that do not meet the full-review word requirement.
They can include:
Immediate reactions after reading
Brief opinions
Memorable observations
A short response to another reader's interpretation
Thoughts shared while currently reading
Short Thoughts should have a lightweight composer and appear in their own book-level feed and relevant member feeds.
A Short Thought must not automatically become a full review merely because it discusses a book.
Members should be able to create either content type independently.


6. The Recometer
The Recometer is Inktella's signature recommendation indicator.
It answers one question:
Would you recommend this book to another reader?
Voting options
Would recommend
Wouldn't recommend
Display
Show a horizontal visual indicator with:
Percentage of members who would recommend the book
Percentage who wouldn't
Total number of valid votes
For example:
78% would recommend · 22% wouldn't
These are illustrative values only.
Voting behaviour
Any eligible member can vote without publishing a review.
One active vote per member per book.
Members can change or withdraw their vote.
Votes must be associated with the authenticated member and canonical book.
Percentages and totals update when valid votes change.
Do not count duplicate submissions.
Prevent automated vote manipulation through appropriate rate limits and abuse controls.
Do not present a percentage without a visible vote count.
Use server-calculated totals and percentages rather than trusting values submitted by the client.
The Recometer is not a star rating. It measures willingness to recommend, not perceived quality.


7. Reader Consensus
Reader Consensus is a community-powered voting system that summarizes subjective characteristics of a book.
It uses horizontal segmented bars similar to the supplied reference screenshot. Each question displays its answer distribution, percentages, and a clear legend.
Example questions for fiction
Reading pace
Fast
Medium
Slow
Plot or character driven?
Plot
A mix
Character
Strong character development?
Yes
Complicated
No
Lovable characters?
Yes
Complicated
No
Diverse cast of characters?
Yes
Somewhat
No
Other potential questions include predictability, writing style, emotional impact, world-building, readability, and complexity.
Question design
Questions should be adapted to the book's category. Fiction, nonfiction, poetry, biography, and other categories can have different question sets.
Do not overwhelm every book page with dozens of questions. Start with a concise set of relevant questions and expand when there is evidence that members find additional questions useful.
Voting rules
Members vote independently of writing reviews.
One current answer per member per question per book.
Members can update their answers.
Store votes individually and calculate distributions from valid votes.
Show vote counts alongside percentages.
Display an appropriate empty state when there are no votes.
Avoid suggesting that a result based on very few votes represents the entire readership.
Presentation
Use horizontal segmented bars with clear labels, distinct colours, percentages, and legends. Keep the visualization responsive on mobile.
Reader Consensus and the Recometer must remain separate features: one summarizes book characteristics; the other measures recommendation intent.


8. Reading Status and Personal Shelves
Each member can track their relationship with every book.
Reading statuses
Want to Read
Currently Reading
Read
Allow members to change status easily from a book page and relevant search or discovery interfaces.
A member should have one current status per book. Status changes should update the member's shelves and any appropriate reading activity.
Personal reading profile
Each member profile should include:
Want to Read shelf
Currently Reading shelf
Read shelf
Published reviews
Short Thoughts
Followed reviewers
Follower and following counts
Shelves should be public by default if that is the chosen community model, with appropriate privacy controls where supported.
Reading status should not require a review, rating, or public post.


9. Discussion
Every book has a dedicated discussion space.
Members can start discussion threads, ask questions, offer interpretations, and respond to other readers.
Required functionality
New discussion threads
Replies and threaded conversations
Likes or reactions
Spoiler warnings
Reporting and moderation
Links back to the relevant book
Notifications for replies and other relevant interactions
Discussion must be distinct from full reviews. It should support back-and-forth conversation rather than require members to publish standalone articles.
Spoiler handling should be available for both reviews and discussion content. Members should be able to identify significant spoilers, and the interface should provide a warning before displaying concealed content.


10. Member Profiles and Professional Reviewer Pages
Every member receives a public profile. Professional reviewers use the same underlying account system, with additional presentation and optional paid tools.
Standard member profile
Include:
Profile image
Display name and username
Biography
Reading shelves
Published reviews
Short Thoughts
Followers and following
Recent activity
Professional reviewer profile
A professional profile is a portfolio for people who write about books, including literary critics, book bloggers, editors, and independent reviewers.
Potential features:
Professional biography
Areas of expertise and preferred genres
Published review portfolio
Featured reviews
External website and social links
Contact information or contact links
Audience analytics
Professional designation or verification where earned
Professional status must not guarantee visibility, positive reviews, or higher community vote totals.

Following
Members can follow other reviewers. New reviews from followed members should appear in a personalized feed.
The feed should emphasize newly published reviews, while still providing room for other activity and discovery.


11. Home Feed and Discovery
The home feed connects members with the books and reviewers they care about.
Following feed
Prioritize activity from followed members:
Newly published reviews
Short Thoughts
Discussion activity where relevant
Reading updates where appropriate
Discovery feed
Help members discover:
New and noteworthy reviews
Reviews receiving meaningful engagement
Popular book discussions
Books receiving substantial reader activity
Reviewers worth following
Editorially selected articles
Do not let popularity become the only discovery mechanism. A new review from a lesser-known writer should still have opportunities to be discovered.
Search
Provide search across:
Book titles
Authors
Members and reviewers
Review articles
Relevant genres and categories
Book search should return canonical book records and avoid duplicate results.


12. Submit a Book
Paying members can submit a book to the Inktella catalogue without applying to become its author.
Submission fields
Required:
•Book cover
Book title
Author name
Optional:
ISBN
Publication year
Genre or category
Synopsis

Submission workflow
Contributor searches for the book.
The system checks for an existing match.
If found, the contributor opens the existing book page.
If no match exists, the contributor submits the basic metadata.
The backend validates and deduplicates the record.
The book becomes available according to the platform's publication and moderation rules.
ISBN is useful for matching editions, but it should not be the only deduplication method.

Distinguish books from editions where necessary.
Keep catalogue administration separate from author-profile management.

13. Author Profiles and Participation
Authors should be able to claim an author profile and connect their books.
Basic author participation and claiming an eligible profile should remain free.
An author profile can include:
Biography
Published books
Links to official websites
Relevant announcements
Links to reviews written by independent members
Overall Recometer score
Authors must not be able to edit, suppress, or purchase favourable independent reviews simply because they own the book.
Author requests concerning book listings, cover permissions, factual metadata, and independent reviews should be evaluated separately.


14. Monetization
Inktella should monetize additional value without charging ordinary members to participate in the community.
Free community access
Keep the following free:
Account creation
Book discovery
Book submissions
Reading shelves and status controls
Full reviews
Short Thoughts
Recometer votes
Reader Consensus votes
Discussions
Following reviewers
Standard member profiles
Basic author profiles
Professional reviewer plan
Introduce an optional subscription when there is demonstrated demand.
Potential paid benefits
Advanced portfolio customization
Review readership analytics
Newsletter
Enhanced professional presentation

Do not charge members simply to publish full reviews or build a basic portfolio.
Affiliate revenue
Allow reviewers to add their own affiliate links to individual reviews.
Inktella may also operate its own affiliate partnerships, provided the relevant programmes permit the intended use.
Requirements:
Clearly disclose affiliate relationships.
Distinguish platform links from reviewer-owned links.
Never make a positive review a condition of earning a commission.
Do not imply that Inktella endorses every linked retailer.
Comply with applicable affiliate-programme terms.

Monetization
Consider optional reader support through buy me a coffee or PayPal user can link out externally. 


15. Notifications
Implement notifications for meaningful events:
New followers
Likes on reviews
Comments and replies
Replies to discussions
Relevant activity on a member's content
Notifications should link directly to the relevant review, discussion, or profile.
Allow members to manage notification preferences. Avoid generating notifications for every vote or routine reading-status change unless that behaviour is deliberately enabled.


16. Administration and Moderation
Provide an administrative interface for managing the catalogue and maintaining a healthy community.
Administrative capabilities
Review and moderate reported content
Manage book records and duplicates
Correct inaccurate metadata
Manage genres and question sets
Manage cover-image sources or uploads 
Manage user restrictions and suspensions
Review professional verification applications
Admin can add book data and publish.




Core data entities
Design the database around entities such as:
Users
User profiles
Professional reviewer profiles
Authors
Books
Book editions
Book-author relationships
Cover assets
Reading statuses
Reviews
Short Thoughts
Review interactions
Discussions
Discussion replies
Recometer votes
Reader Consensus questions
Reader Consensus votes
Follows
Notifications
Affiliate links
Subscriptions and payment records
Reports and moderation actions
Backend requirements
Enforce authentication and authorization on protected operations.
Enforce the full-review minimum word count on the server.
Use database constraints to prevent duplicate active votes.
Validate all submitted content and external URLs.
Use pagination for reviews, discussions, and feeds.
Use indexes for common search and lookup patterns.
Apply appropriate rate limits and anti-abuse controls.
Keep secrets and privileged credentials on the server.
Implement safe handling of user-generated content.
Ensure the frontend never determines authoritative vote totals or permissions.
Support account deletion and appropriate data-retention requirements.
Suggested initial database relationships
A book can have many reviews, Short Thoughts, discussion threads, and reading-status records.
A user can publish many reviews and Short Thoughts, maintain reading statuses for many books, and follow many other users.
A user has one active reading status per canonical book, one active Recometer vote per book, and one active Reader Consensus answer per question and book.
Each review belongs to one user and one book. Each discussion thread belongs to one book, and each reply belongs to a thread or parent reply.
These relationships should be enforced through database constraints and appropriate backend validation.





19. Acceptance Criteria
The first release is ready for launch when:
Every book has a stable, shareable page.
Paid Members can submit books without a lengthy application.
Duplicate book records are handled appropriately.
Members can maintain and change their reading statuses.
Members can publish full reviews without using a fixed template.
Reviews under 100 substantive words cannot be published as full reviews.
Short Thoughts support brief reactions independently of full reviews.
Every review is discoverable through its book and author profile.
Recometer votes are unique per member and book, with correct server-calculated results.
Reader Consensus votes are unique per member, question, and book.
Community voting displays meaningful percentages and vote counts.
Discussions support replies and appropriate moderation.
Members can follow reviewers and discover new reviews.
Administrative tools can manage catalogue quality and reported content.
The platform provides a process for copyright concerns and cover-image removal requests.
Monetization does not control independent reviews or community votes.
The interface works on mobile and desktop.


20. Final Product Direction
Inktella should feel like a place where people discover books through other people's writing.
A book page collects the perspectives. A reviewer profile builds a body of work. The feed connects readers to new writing. The Recometer and Reader Consensus summarize collective experiences without replacing the reviews themselves.
Core positioning:
Inktella — One book. Hundreds of perspectives. Minimal UI,  simplicity, ease, yet welcoming. 
User mderrickm00@gmail.com will be the admin.  Light and dark mode support please.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/89e2b75e-e08f-4b5d-bec0-0b67c0992190).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
