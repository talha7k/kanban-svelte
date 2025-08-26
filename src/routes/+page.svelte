<script>
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
  <div class="container mx-auto px-4 py-16">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to Kanban
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Organize your projects and tasks with our intuitive kanban board system. 
        Collaborate with your team and boost productivity.
      </p>
    </div>

    <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
      <Card class="text-center">
        <CardHeader>
          <CardTitle>Team Collaboration</CardTitle>
          <CardDescription>Work together seamlessly</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-gray-600 dark:text-gray-300">
            Invite team members, assign tasks, and track progress in real-time.
          </p>
        </CardContent>
      </Card>

      <Card class="text-center">
        <CardHeader>
          <CardTitle>Visual Boards</CardTitle>
          <CardDescription>See your workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-gray-600 dark:text-gray-300">
            Drag and drop tasks between columns to manage your project workflow visually.
          </p>
        </CardContent>
      </Card>

      <Card class="text-center">
        <CardHeader>
          <CardTitle>Powerful Analytics</CardTitle>
          <CardDescription>Track your progress</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-gray-600 dark:text-gray-300">
            Get insights into team performance and project completion rates.
          </p>
        </CardContent>
      </Card>
    </div>

    <div class="text-center mt-12">
      <div class="space-x-4">
        <Button size="lg" onclick={() => goto('/login')}>
          Get Started
        </Button>
       
      </div>
    </div>
  </div>
</div>
