import { z } from "zod"
import { pullRequestSchema } from "~/schemas/pullRequestSchema"
import { defineWebhookAction } from "~/utils/defineWebhookAction"
import { PullRequestThread } from "~/utils/PullRequestThread"
import { replaceUsernames } from "~/utils/replaceUsernames"

export const pullRequestCommented = defineWebhookAction({
    eventType: 'pull_request_review_comment',

    errorMessage: 'Failed to post comment to slack thread.',

    schema: z.object({
        action: z.literal('created'),
        pull_request: pullRequestSchema,
        comment: z.object({
            body: z.string(), // body must be required, otherwise no idea to run this action
            id: z.number(),
            path: z.string(),
            user: z.object({
                login: z.string(),
                avatar_url: z.string()
            })
        })
    }),

    handler: async ({ body, workspaceId, user, token, db }) => {
        const thread = await PullRequestThread.getFromDb(db, workspaceId, body.pull_request.node_id, token)

        const comment = await replaceUsernames(db, workspaceId, body.comment.body)
        const linkText = `${body.comment.path}#`
        const text = `[${linkText}](${body.pull_request.html_url}/files#r${body.comment.id})\r\n\r\n${comment}`

        await thread.replyToThread(text, user)

        return 'Comment posted successfully'
    }

})
