import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import { memo, useCallback, useEffect } from "react"
import { type CloudItem, type CloudItemShared } from "@filen/sdk"
import List from "./list"
import { type Prettify } from "@/types"
import worker from "@/lib/worker"
import useRouteParent from "@/hooks/useRouteParent"
import { useDriveItemsStore, useDriveSharedStore } from "@/stores/drive.store"
import { promiseAllChunked } from "@/lib/utils"
import { directoryUUIDToNameCache } from "@/cache"
import useErrorToast from "@/hooks/useErrorToast"

export type DriveCloudItem = Prettify<
	CloudItem &
		CloudItemShared & {
			selected: boolean
		}
>

export const Drive = memo(() => {
	const parent = useRouteParent()
	const { setItems } = useDriveItemsStore()
	const { currentReceiverId, currentSharerId, currentReceiverEmail, currentReceivers, currentSharerEmail } = useDriveSharedStore()
	const errorToast = useErrorToast()

	const uploadFiles = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				e.target.value = ""

				return
			}

			const files = e.target.files
			const parentCopy = `${parent}`
			const promises: Promise<void>[] = []

			for (const file of files) {
				promises.push(
					new Promise((resolve, reject) => {
						worker
							.uploadFile({
								file: file,
								parent: parentCopy,
								sharerId: currentSharerId,
								sharerEmail: currentSharerEmail,
								receiverEmail: currentReceiverEmail,
								receiverId: currentReceiverId,
								receivers: currentReceivers
							})
							.then(item => {
								if (item.parent === parentCopy) {
									setItems(prev => [
										...prev.filter(
											prevItem =>
												prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()
										),
										item
									])
								}

								resolve()
							})
							.catch(reject)
					})
				)
			}

			try {
				await promiseAllChunked(promises)
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				e.target.value = ""
			}
		},
		[currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId, setItems, parent, errorToast]
	)

	const uploadDirectory = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				e.target.value = ""

				return
			}

			const files: { file: File; webkitRelativePath: string }[] = []

			for (const file of e.target.files) {
				files.push({ file, webkitRelativePath: file.webkitRelativePath })
			}

			const parentCopy = `${parent}`

			try {
				const uploadedItems = await worker.uploadDirectory({
					files,
					parent: parentCopy,
					sharerId: currentSharerId,
					sharerEmail: currentSharerEmail,
					receiverEmail: currentReceiverEmail,
					receiverId: currentReceiverId,
					receivers: currentReceivers
				})

				for (const item of uploadedItems) {
					if (item.type === "directory") {
						directoryUUIDToNameCache.set(item.uuid, item.name)
					}

					if (item.parent !== parentCopy) {
						continue
					}

					setItems(prev => [
						...prev.filter(prevItem => prevItem.uuid !== item.uuid && prevItem.name.toLowerCase() !== item.name.toLowerCase()),
						item
					])
				}
			} catch (e) {
				console.error(e)

				errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
			} finally {
				e.target.value = ""
			}
		},
		[currentReceiverEmail, currentReceiverId, currentReceivers, currentSharerEmail, currentSharerId, setItems, parent, errorToast]
	)

	const keyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault()
				e.stopPropagation()

				setItems(prev => prev.map(prevItem => ({ ...prevItem, selected: true })))

				return
			}
		},
		[setItems]
	)

	useEffect(() => {
		window.addEventListener("keydown", keyDownListener)

		return () => {
			window.removeEventListener("keydown", keyDownListener)
		}
	}, [keyDownListener])

	return (
		<RequireAuth>
			<MainContainer>
				<input
					type="file"
					id="folder-input"
					multiple={true}
					// @ts-expect-error Not typed
					directory=""
					webkitdirectory=""
					mozdirectory=""
					onChange={uploadDirectory}
					className="hidden"
				/>
				<input
					type="file"
					id="file-input"
					multiple={true}
					onChange={uploadFiles}
					className="hidden"
				/>
				<div className="w-full h-full flex flex-col select-none">
					<List />
				</div>
			</MainContainer>
		</RequireAuth>
	)
})

export default Drive
