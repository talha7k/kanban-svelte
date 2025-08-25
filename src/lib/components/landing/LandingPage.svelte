<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import KanbanIcon from '$lib/components/icons/KanbanIcon.svelte';
	import {
		Users,
		Lock,
		MessageSquare,
		Edit,
		Move,
		Rocket,
		Sparkles,
		ArrowRight,
		Check
	} from '@lucide/svelte';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	function navigateToSignup() {
		goto('/signup');
	}

	function navigateToLogin() {
		goto('/login');
	}
</script>

<div class="flex flex-col min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 text-foreground">
	<!-- Hero Section -->
	<section class="flex flex-col items-center justify-center py-20 md:py-32 px-6 text-center">
		<div class="animate-in fade-in-0 zoom-in-95 duration-1000">
			<KanbanIcon className="w-28 h-28 md:w-32 md:h-32 text-primary mb-8 animate-pulse" />
		</div>
		<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-200">
			<h1 class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
				Your Team's Workflow,{' '}
				<span class="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
					Supercharged
				</span>.
			</h1>
		</div>
		<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-400">
			<p class="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl">
				Stop juggling tasks and start delivering results. Our intuitive Kanban
				platform empowers your web development team to create, manage, and
				collaborate with unparalleled clarity and control.
			</p>
		</div>
		<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-600">
			<div class="flex flex-col sm:flex-row gap-4">
				<Button
					size="lg"
					class="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl px-8 py-6 text-lg group"
					onclick={navigateToSignup}
				>
					Get Started - It's Free!
					<ArrowRight class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
				</Button>
				<Button
					variant="outline"
					size="lg"
					class="border-primary text-primary hover:bg-primary/10 shadow-lg transition-all hover:scale-105 hover:shadow-xl px-8 py-6 text-lg"
					onclick={navigateToLogin}
				>
					Already have an account? Login
				</Button>
			</div>
		</div>
		<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-800">
			<p class="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
				<Check class="h-4 w-4 text-green-500" />
				No credit card required. Unlock your team's potential today.
			</p>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-16 md:py-24 bg-background/30 px-6">
		<div class="container mx-auto">
			<div class="text-center mb-12 md:mb-16 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
				<h2 class="text-3xl md:text-4xl font-bold mb-4">
					Why You'll Love <span class="text-primary">DijiKanban</span>
				</h2>
				<p class="text-lg text-muted-foreground max-w-2xl mx-auto">
					We've built the features your web development team actually needs
					for seamless project management.
				</p>
			</div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				<!-- Feature 1: Team Creation & Management -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-200">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<Users class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Effortless Team Management
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Create and manage multiple teams with ease. Each team can have
								multiple members that will get exclusive access to the projects
								created for that team.
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				<!-- Feature 2: Team Invitations -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-400">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<Rocket class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Seamless Onboarding
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Invite new members to your teams by having them registered on
								DijiKanban. Expand your collaborative workspace and bring all
								your team members together under one roof.
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				<!-- Feature 3: Project Creation within Teams -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-600">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<Edit class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Organize with Projects
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Everyone in the team cannot have access to all the projects.
								Create dedicated projects to segment your team. Each project
								acts as a focused workspace for specific members assigned to it.
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				<!-- Feature 4: Task Management within Projects -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-800">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<Move class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Detailed Task Tracking
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Break down projects into manageable tasks. Assign tasks to team
								members, set deadlines, and track progress from creation to
								completion, ensuring nothing falls through the cracks.
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				<!-- Feature 5: In-Task Collaboration -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-1000">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<MessageSquare class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Contextual Discussions
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Keep conversations focused and relevant with task-specific
								comments and discussions. No more scattered communication
								across multiple platforms.
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				<!-- Feature 6: Security & Privacy -->
				<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-1200">
					<Card class="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
						<CardHeader>
							<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
								<Lock class="w-6 h-6 text-primary" />
							</div>
							<CardTitle class="text-xl font-semibold mb-3">
								Secure & Private
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription class="text-muted-foreground leading-relaxed">
								Your data is protected with enterprise-grade security.
								Role-based access control ensures team members only see
								what they need to see.
							</CardDescription>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-16 md:py-24 px-6 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
		<div class="container mx-auto text-center">
			<div class="animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
				<Badge variant="secondary" class="mb-4 px-4 py-2 text-sm font-medium">
					<Sparkles class="w-4 h-4 mr-2" />
					Ready to Transform Your Workflow?
				</Badge>
				<h2 class="text-3xl md:text-4xl font-bold mb-6">
					Join Thousands of Teams Already Using DijiKanban
				</h2>
				<p class="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
					Start organizing your projects today. No setup fees, no hidden costs,
					no complicated configurations. Just pure productivity.
				</p>
				<Button
					size="lg"
					class="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl px-8 py-6 text-lg group"
					onclick={navigateToSignup}
				>
					Start Your Free Trial
					<ArrowRight class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
				</Button>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="py-8 px-6 border-t bg-background/50">
		<div class="container mx-auto text-center">
			<div class="flex items-center justify-center mb-4">
				<KanbanIcon className="w-6 h-6 text-primary mr-2" />
				<span class="font-bold text-lg">DijiKanban</span>
			</div>
			<p class="text-sm text-muted-foreground">
				© 2024 DijiKanban. Empowering teams to achieve more.
			</p>
		</div>
	</footer>
</div>

<style>
	@keyframes animate-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-in {
		animation: animate-in 0.6s ease-out forwards;
	}

	.fade-in-0 {
		opacity: 0;
	}

	.slide-in-from-bottom-4 {
		transform: translateY(1rem);
	}

	.zoom-in-95 {
		transform: scale(0.95);
	}

	.delay-200 {
		animation-delay: 200ms;
	}

	.delay-400 {
		animation-delay: 400ms;
	}

	.delay-600 {
		animation-delay: 600ms;
	}

	.delay-800 {
		animation-delay: 800ms;
	}

	.delay-1000 {
		animation-delay: 1000ms;
	}

	.delay-1200 {
		animation-delay: 1200ms;
	}

	.duration-1000 {
		animation-duration: 1000ms;
	}
</style>