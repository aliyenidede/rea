# video title: Andrej Karpathy's Math Proves Agent Skills Will Fail. Here's What to Build Instead.

0:00
A lot of people are banking on 2026 to
0:02
be the year where AI gets real work done
0:05
and delivers real business value. And
0:07
I'm not talking about small stuff like
0:08
writing blog posts or drafting social
0:11
media content. I'm talking about an AI
0:13
system that can successfully execute
0:15
complex workflows that really impact the
0:17
bottom line. Things like compliance
0:19
audits, risk analysis, financial
0:22
reports, impact assessments. These are
0:24
complex multi-stage human processes that
0:27
involve large amounts of data that are
0:29
in theory primed for AI. And the biggest
0:32
challenge with these types of workflows
0:34
is reliability. Andre Carpathy describes
0:37
this as the march of nines where you can
0:39
reach the first 90% of reliability with
0:42
a strong build and a good demo. But each
0:45
additional nine requires comparable
0:47
engineering effort to achieve. And the
0:49
thing is agentic workflows compound
0:52
failure. for a 10step agentic workflow
0:55
like let's say a compliance audit. If
0:57
you have a 90% success rate per step,
1:00
then running that workflow 10 times a
1:02
day will result in over six failures
1:04
every day. If you can boost your success
1:06
rate to 99% per step, then you're down
1:09
to one failure every day. Achieve 99.9%
1:12
every step and you're down to one
1:14
failure every 10 days and so on. And
1:16
while this example may be a bit extreme
1:18
because you might have human in the
1:20
loop, you might have non-agentic steps
1:23
in a flow, the key thing here is for
1:25
businesses to fully adopt these AI
1:27
systems, they need to be highly
1:29
dependable and reliable like traditional
1:32
software. One possible solution to this
1:34
is the concept of agent skills. These
1:36
are portable self-contained units of
1:38
domain knowledge and procedural logic
1:41
along with optional supporting files
1:43
that can help in achieving the task.
1:45
I've done a full deep dive into skills
1:47
on this channel which I'll leave a link
1:48
for above. But essentially for a complex
1:50
workflow like customer on boarding, you
1:52
can document the specific operating
1:54
procedure in the skill markdown file.
1:56
Step 1 2 3 and four as you can see here.
1:59
And the AI's task is to follow the steps
2:01
to achieve the outcome. And that's
2:03
exactly what Anthropic did last month
2:04
when they released their concept of
2:06
plugins which are essentially bundles of
2:08
skills that are domain specific. You
2:10
know, legal, finance, HR. And even
2:13
though these are essentially just
2:14
markdown files, this sent a shock wave
2:16
through the stock market, triggering a
2:18
mass selloff in the stocks of SAS
2:20
companies. And while this concept of
2:21
plugins and skills is a very powerful
2:23
idea, they are by no means perfect.
2:26
Agent skills are essentially just
2:27
prompts. You're baking your process into
2:29
a message to the AI and you're hoping
2:31
that it adheres to the instructions,
2:33
hoping it doesn't hallucinate, quit
2:35
early, skip steps, etc. Skillsbench
2:38
carried out an evaluation of 84 popular
2:40
skills in the market across all models.
2:43
And while the addition of skills did
2:45
definitely improve the pass rates of
2:47
these tests, the overall success rates
2:50
are well shy of what a business would
2:51
need to reliably use that at scale
2:53
without human intervention. There are
2:55
ways that you can improve the
2:56
performance of skills through evalment,
2:59
but you will never reach incredibly high
3:01
levels of reliability through prompting
3:03
alone. The solution is to harness the
3:05
power of these AI systems by putting
3:07
them on deterministic rails. And this is
3:10
exactly what Stripe did with their
3:11
concept of minions where they built a
3:14
scaffold around clawed code to ensure
3:16
all generated code changes like bug
3:18
fixes or new features were automatically
3:21
validated against a subset of their 3
3:23
million tests in their test suite. They
3:25
didn't just prompt the AI to carry out
3:27
tests. They guaranteed it by baking it
3:29
into the process. And with this harness
3:31
in place, they're able to merge 1,300
3:34
pull requests every week. So for complex
3:37
multi-stage longunning workflows, the
3:39
best approach is to create a specialized
3:41
harness where you can gate and validate
3:43
the output of each stage to ensure it
3:45
stays on track. And this is just one
3:47
aspect of harness engineering which is
3:49
an evolving discipline. Because
3:51
harnesses are essentially just the
3:53
software layer that wraps around an AI
3:55
model, there are lots of different
3:56
harness designs and architectures that
3:58
you can create. General purpose
4:00
harnesses like clawed code and manis are
4:02
incredibly powerful. Whereas for these
4:05
multi-stage complex workflows,
4:07
specialized harnesses are the way to go.
4:09
But there's lots of others. Autonomous
4:11
harnesses like openclaw, hierarchical
4:13
and multi-agent harnesses where you have
4:15
swarms of agents that are coordinated or
4:17
DAG harnesses where your workflow is
4:19
plotted on a graph and you can have the
4:21
likes of branching, conditional
4:22
splitting, parallel execution. To
4:25
demonstrate the concepts of harness
4:26
engineering, I built a specialized
4:29
harness into our Python and React app
4:31
that I'm building out on this channel as
4:33
part of our AI builder series. I took
4:35
inspiration from Anthropic's legal
4:37
plug-in and their contract review skill.
4:39
I took the steps in their skills file
4:41
and codified the process into a more
4:43
comprehensive and reliable system. And
Specialized Harness Demo
4:45
this is it in action. I've dropped in
4:47
the logo of a law firm here because this
4:49
type of complex workflow, a contract
4:51
review workflow, is only worth building
4:54
into a specialized harness if you need
4:55
to operate it at scale. So depending on
4:58
the size of the law firm, they may have
4:59
a few of these every week. So firstly,
5:01
we want to specifically select contract
5:03
review as a mode, which is different to
5:06
skills where it's up to the AI to decide
5:08
to pull it in or not. So we definitely
5:10
want to trigger the harness here. So
5:12
contract review, we then upload our
5:14
file. Let's go with our sample SAS
5:16
agreement and we'll just say please
5:18
review and you can see our file has been
5:20
uploaded to the workspace. We click go
5:22
and there's lots of concepts now of
5:24
harness engineering that you're going to
5:25
see in action. So the idea of a virtual
5:28
file system is the first thing and now
5:30
you can see a plan that's appeared and
5:33
these are to-dos that are being checked
5:34
off and this is the harness in action.
5:37
So this is all codified in Python
5:39
created by clawed code. This process
5:42
that has now been executed is
5:44
essentially the standard operating
5:46
procedure let's say of the law firm.
5:48
It's extracted the text from the
5:50
document as part of phase one. There's
5:52
verification that it has got what it
5:54
needs and then it moves to phase two
5:56
which classifies the contract. This is
5:58
an LLM call again with a structured
6:00
validated schema that needs to be
6:02
populated. And then we're into phase
6:04
three which is asking the user
6:06
clarifying questions before it carries
6:08
out the analysis. So this is an example
6:10
of human in the loop. So which side are
6:12
we on? Let's say we're representing the
6:14
customer. Deadline is tomorrow and let's
6:17
leave it at that. So then phase four, it
6:19
loads up the playbook. So we have our
6:21
playbook within our doc section here. So
6:24
this is essentially rag. You have your
6:26
standard operating procedures, your
6:28
precedents, your policies, etc. So it
6:31
has completed that research and then it
6:33
moves on to clause extraction. And for
6:35
very large contracts, you can use
6:37
chunking here. So it's not a single
6:39
shot. And this is the beauty of
6:41
specialized harnesses because it's
6:43
Python, you have total flexibility on
6:45
how you want to actually do this. So
6:47
it's successfully extracted 34 clauses.
6:50
And then the really interesting part
6:52
kicks off, which is the risk analysis.
6:55
So as part of our process, for every
6:58
single clause, we want to spin up a
7:00
dedicated LLM to carry out research and
7:03
risk analysis. So you can see different
7:05
tool calls for every single clause. It's
7:07
loading up both the playbook as well as
7:09
any other research that might be
7:11
available, let's say, within the
7:13
knowledge base for this law firm. And
7:16
this is the concept of sub aents within
7:18
a harness. So all of these sub aents
7:21
have isolated context. So it's not
7:23
polluting the context of the main agent.
7:25
This is acting as the orchestrator. So
7:27
then we're into phase seven, red line
7:29
generation. And again, sub agents
7:32
kicking off to actually carry out the
7:34
tasks. And this gives the scale that's
7:37
needed for very large contracts and
7:39
longunning tasks. So we have generated
7:41
our 22 red lines and now it's creating
7:44
an executive summary. So you can see the
7:46
plan is constantly being updated. And
7:49
then you can also see the files. This is
7:51
the scratch pad of this agent within
7:54
this workspace. Every phase generates a
7:57
file. So that way you have resilience.
7:59
So if there is an issue at any point,
8:01
you can restart the process halfway
8:03
through and load up the progress from a
8:05
previous phase. And there's our
8:07
executive summary at which point the
8:09
harness is now complete. And this is the
8:11
word document that it generated. So we
8:13
can download it. And in terms of
8:14
reliability, this document is a
8:16
template. This is fully programmatically
8:19
generated in the harness. If you were
8:21
leaving this up to the LLM to generate a
8:23
word document every time, you would get
8:25
different formats. Sometimes it might
8:27
fail completely. Whereas having it fully
8:29
scripted in the harness means it will
8:31
execute against your template every
8:32
time. It contains the executive summary,
8:35
the various yellow lines and red lines
8:37
with original text and proposed text
8:39
along with rationale. Again, all baked
8:41
into the logic of the harness. And if we
8:44
look at the bottom here, you can see
8:45
that there's only 7,000 tokens used of
8:47
this main agent. Whereas if we go into
8:49
Langfuse and jump into that specific
8:52
thread, you can see that overall this
8:54
thread took 323,000
8:57
tokens. So that is just a huge amount of
9:00
sub agents that have been triggered to
9:02
carry out a really detailed analysis of
9:05
this contract. And another interesting
9:07
aspect of a harness is that you can use
9:09
different models for different tasks. So
9:11
our main agent that we're conversing
9:13
with in this thread is Gemini 2.5 Pro.
9:16
I'm using open router here. Whereas if
9:18
you jump into any of the sub agents,
9:20
these deep agent tasks, you can see
9:23
we're using Gemini 2.5 flash. So it's
9:26
obviously a lot cheaper because these
9:27
are obviously much more specialized
9:29
tasks that they're carrying out at
9:30
scale. So we need to keep the costs
9:32
under control, but we're still getting
9:35
the accuracy that we need from the
9:36
smaller model because it's a very narrow
9:38
task that we're asking them to complete.
9:40
And from there, you can then converse
9:41
with the agent about the actual report.
9:43
It has full access to the file system.
9:45
So it can make changes to files, carry
9:47
out more research against the knowledge
9:49
base, whatever you want to do. So
9:50
everything you just saw there, the
9:52
harness, the sub agents, skills,
9:54
documents, this is all built out in our
9:56
AI builder series on our YouTube
9:58
channel. This is the sixth episode in
10:00
the series. And if you'd like to build
10:02
along, the PRDs for this module are
10:04
available in our public GitHub repo.
10:07
While our full AI builder course and
10:08
codebase are available in our community,
10:10
the AI automators. This is a private
10:13
community of hundreds of serious
10:14
builders, all creating specialized
10:16
harnesses and advanced rag systems. We'd
10:19
love to see you in here. So, if you'd
10:20
like to join, check out the link in the
10:22
description below. So, as you can see,
10:23
there are lots of benefits to building
10:25
agent harnesses to solve real world
10:27
problems. It helps you keep longunning
10:29
tasks on track. It handles tasks that
10:32
are just too complicated for an agent to
10:34
complete within a single context window.
10:36
It solves the problem of context rot
10:38
because you're able to protect the
10:40
context window of the main agent that
10:41
you're conversing with. So you're not
10:43
maxing it out and getting garbled
10:45
incoherent answers. With the harness,
10:47
you can build in observability and
10:49
transparency. And similar to what you
10:51
saw with the generation of the word
10:52
document earlier, because you can
10:54
actually programmatically do a lot of
10:56
things within a harness, you can improve
10:58
its reliability. And through using
11:00
cheaper models within sub agents, you
11:02
can keep costs under control while still
11:04
burning lots of tokens. If you are
11:06
looking to build an agent harness for
11:08
your AI system, here are 12 things you
11:10
absolutely need to know when it comes to
11:12
designing it. The first is harness
11:14
architecture. I showed this slide
11:16
earlier about the different design
11:17
patterns that you can use. And from a
11:19
helicopter view, it is worth researching
11:21
and investigating these types of design
11:23
patterns so you can get your project off
11:25
to the right start. Within my project
11:28
here, I have a single threaded
11:29
supervisor essentially as part of a
11:31
specialized harness. A key aspect of
11:34
harnesses is the idea of planning. And
11:37
all of the popular harnesses like
11:38
Clawude Code, like Manis have a version
11:41
of planning to be able to keep their
11:43
long running agents on track. And the
11:46
research shows this that the longer an
11:48
AI runs, the more tool calls it uses, if
12 Things You Need to Know
11:51
it's not able to ground itself on the
11:53
general outline of a plan, in a lot of
11:55
cases, it can end up totally off track
11:57
from the original request. And it is
11:59
useful to think of these plans as either
12:01
fixed or dynamic. So within this
12:03
contract review system, we have eight
12:05
phases and it's the exact same steps
12:07
each time. Whereas you can also have a
12:10
dynamic plan. So here I'm just going to
12:12
use deep mode which is a system we've
12:14
created. And I'm going to ask it to plan
12:16
my birthday party. And the LLM is going
12:18
to generate its own plan depending on
12:21
the request. So, you can see it's
12:23
written its own to-dos. Propose a theme,
12:25
find a venue, plan activities, suggest
12:27
food. And what's interesting about this
12:30
type of dynamic plan is that as it works
12:32
through step by step, it has the ability
12:35
to change the ordering of the items. It
12:38
can tick things off. It can remove
12:40
items, add new items in. So, it is
12:42
totally dynamic. And that's why this
12:45
type of dynamic plan is not suitable for
12:47
my contract review harness because I
12:49
don't want the LLM making it up as it
12:51
goes along. I want to actually rein it
12:53
in. I want it on deterministic rails.
12:56
All harnesses make use of a file system
12:59
in one shape or another. In cloud code,
13:01
for example, it's a CLI application that
13:04
has full access to the directory of your
13:07
codebase. Whereas for the likes of Manis
13:09
or my own system here, I have built a
13:11
virtual file system. As you can see on
13:13
the bottom right, this is essentially a
13:15
scratch pad that the agent is able to
13:17
write files to, read files from, make
13:20
updates, etc. And then the scope of this
13:23
file system, this is essentially a
13:25
workspace that's tied to this chat
13:28
thread. As you saw in our demo, the idea
13:30
of delegating tasks is a key part of a
13:33
harness. Because if you're not
13:34
delegating tasks, it's essentially just
13:36
a single LLM call that has tool calling
13:38
capabilities. By delegating tasks,
13:41
you're able to achieve context
13:42
isolation. So each of those sub aents
13:45
has a completely fresh context window
13:47
and you have total control over what you
13:48
inject into it. And as you saw earlier,
13:51
I was able to use cheaper, faster models
13:52
for the sub aents while keeping the more
13:55
sophisticated, more expensive agent for
13:57
the orchestrator or the supervisor that
13:59
I was conversing with. And the beauty of
14:00
delegating the sub agents is you can
14:02
have parallel processing. So this just
14:05
triggered five sub agents and it's just
14:08
triggered another five sub aents in
14:10
parallel in batches in fact. So Manis
14:13
does this very well with their wide
14:15
research functionality where it could
14:17
research 500 different products for
14:20
example or web pages in parallel and in
14:23
the space of a few minutes generate a
14:25
really comprehensive report. So parallel
14:27
processing of sub aents where there
14:29
isn't actually dependencies in between
14:31
them is very effective. tool calling and
14:34
then guard rails around what tools that
14:36
can be called is a key part of a harness
14:38
as well. You saw here with our load
14:40
playbook we carried out a number of
14:42
different tool calls to traverse the
14:44
knowledge base list GP glob and read but
14:47
you could also have human in the loop
14:49
style approval whereby if you were
14:51
pushing let's say this contract review
14:53
to a legal software system you could
14:56
have it so that it requires a manual
14:58
approval in this interface. So those
15:00
types of access controls and guardrails
15:03
you can build into your custom harness.
15:05
Memory is a key aspect of harnesses,
15:08
particularly the likes of automated
15:09
harnesses like openclaw. And there are
15:12
two key aspects to memory, short-term
15:14
and long-term. Short-term memory is
15:16
generally saved as markdown files and
15:19
then programmatically read into system
15:21
prompts to continue on the process.
15:23
Long-term memory can also be saved to
15:25
markdown files, but obviously you need
15:26
it to persist outside of a single
15:28
workspace. But it doesn't need to be a
15:30
markdown file either. You could use a
15:32
knowledge graph for example, the likes
15:34
of a temporal graph like graffiti. And
15:36
if you look at openclaw, for example,
15:38
every time it's event triggered, it's
15:40
able to read from its memory to figure
15:42
out what to do next. Specialized
15:44
harnesses are essentially state
15:46
machines. Here we have a sequential
15:48
eightphase process. And as you can see
15:50
with the plan on the top right, it is
15:53
keeping track of its state as it
15:54
progresses through. You can obviously
15:56
get a lot more sophisticated with this
15:58
type of statebased workflow. And the key
16:01
aspect then becomes how do you actually
16:02
track state within our system here which
16:04
is built on superbase. We have a harness
16:07
runs table which keeps track of the
16:09
status of each harness run the current
16:12
phase that it is in. So this is
16:14
essentially state management where the
16:16
actual state machine is codified in the
16:18
contract review Python file within the
16:20
harness engine itself. So even if you're
16:22
not a developer, cloud code will be able
16:24
to build out quite sophisticated
16:26
harnesses like this. You'll find code
16:28
execution is pretty central to most
16:30
harnesses as well. Modernday agents
16:32
typically interact with file systems via
16:34
CLI using sandboxes. And this is
16:36
something I went into in a lot of detail
16:38
in our last video around programmatic
16:40
tool calling within a sandbox. LMS are
16:43
brilliant at generating code. So by
16:46
passing it to a secure sandbox like
16:48
this, it's able to read and write files
16:50
into the workspace and then you can
16:52
actually action things. For this we're
16:54
using LLM sandbox which is a great
16:56
GitHub repo and it spins up these
16:58
isolated sandboxes as and when they're
17:01
needed. Context management is obviously
17:03
central to harness engineering from lots
17:05
of different perspectives. Number one,
17:07
you obviously want to avoid context rot.
17:10
So, you want to keep your main
17:12
supervisor agent or the agent you're
17:13
conversing with, you want to keep their
17:15
context as lean as possible. That being
17:18
said, though, that will eventually max
17:19
out if you keep conversing with that
17:21
agent. So, you need a mechanism for
17:23
compacting context and summarizing
17:26
context, very similar to what you see in
17:28
Claude and Claude code. And it's not
17:30
just context management, you need old
17:32
school prompt engineering as well,
17:33
particularly if you have dedicated sub
17:36
agents that you are delegating to.
17:38
There's a lot of good tricks that you
17:39
can use with context management. If you
17:41
have tool calls that output thousands of
17:43
tokens, for example, instead of reading
17:45
it directly into the context, you can
17:48
save it to a file and then only provide
17:50
a summary of that file to the agent and
17:52
then the agent has file navigation tools
17:54
to list GP glob and read that file. So
17:58
this is very useful particularly for the
17:59
likes of a web search tool. You saw
18:01
human in the loop in action earlier
18:02
where even in a sequential eight-phase
18:04
flow like I have here, there can be
18:07
touch points with the user to guide it
18:08
in a certain direction. And as I
18:10
mentioned, for the likes of tool calls,
18:12
you can require human approval if
18:14
needed. Validation loops are a critical
18:16
part of a harness and it's one area
18:18
that's lacking in my system. Clawed code
18:20
does this brilliantly because it can
18:22
generate a piece of code, it can then
18:24
test it programmatically itself, and if
18:26
it fails, it can go back and iterate on
18:28
the code. So if it loops through that a
18:30
few times, you will end up with code
18:33
that actually works. Now while that
18:34
works very well for codebased
18:36
applications, it's a bit different for a
18:38
contract review, but it is still
18:40
possible. You could run validation loops
18:43
on the likes of factchecking or have a
18:45
loop that runs through every clause and
18:46
compares it against the playbook. So if
18:48
the proposed changes don't line up, you
18:51
actually get it to modify itself. So
18:53
this is really where you can improve the
18:54
quality of the output of the harness.
18:57
And finally, agent skills are still
18:59
incredibly useful even within the likes
19:01
of a harness. So essentially, if you
19:03
need something to happen every single
19:05
time, you should codify it. Whereas, if
19:07
you're looking to expand out the
19:08
capabilities and then you're going to
19:10
guide it as a co-pilot, it's well worth
19:13
using agent skills. And on that topic,
19:16
if you would like to learn more about
19:17
agent skills and how you can build them
19:19
into your own custom AI system, then
19:22
check out this video here. Thanks so
19:24
much for watching and I'll see you in
19:25
the next
