export function getErrorMessage(
	error: unknown,
	defaultMessage: string = 'Unknown Error',
) {
	if (typeof error === 'string') return error
	if (
		error &&
		typeof error === 'object' &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return error.message
	}
	console.error('Unable to get error message for error', error)
	return defaultMessage
}

export function formatDate(timestamp: number | string) {
	const date = new Date(Number(timestamp))
	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function timeAgo(timestamp: number | string) {
	const now = Date.now()
	const then = Number(timestamp)
	const diff = Math.max(0, now - then)
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	const weeks = Math.floor(days / 7)
	const months = Math.floor(days / 30)
	const years = Math.floor(days / 365)
	if (years > 0) return `${years} year${years === 1 ? '' : 's'} ago`
	if (months > 0) return `${months} month${months === 1 ? '' : 's'} ago`
	if (weeks > 0) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
	if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
	if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
	if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
	return 'just now'
}
