import { memo, useCallback } from "react"
import useAccount from "@/hooks/useAccount"
import Section from "../section"
import { Switch } from "@/components/ui/switch"
import { showSaveFilePicker } from "native-file-system-adapter"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import useSDKConfig from "@/hooks/useSDKConfig"
import { showTwoFactorCodeDialog } from "@/components/dialogs/twoFactorCodeDialog"
import worker from "@/lib/worker"
import eventEmitter from "@/lib/eventEmitter"
import ChangePasswordDialog from "./dialogs/changePassword"

export const Security = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const { masterKeys, userId } = useSDKConfig()

	const onTwoFactorChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			let toast: ReturnType<typeof loadingToast> | null = null

			try {
				if (checked) {
					if (account.settings.twoFactorEnabled === 1) {
						return
					}

					const code = await showTwoFactorCodeDialog({
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
						continueButtonVariant: "destructive",
						keyToDisplay:
							"otpauth://totp/" +
							encodeURIComponent("Filen") +
							":" +
							encodeURIComponent(account.account.email) +
							"?secret=" +
							encodeURIComponent(account.settings.twoFactorKey) +
							"&issuer=" +
							encodeURIComponent("Filen") +
							"&digits=6&period=30"
					})

					if (code.cancelled) {
						return
					}

					toast = loadingToast()

					await worker.enableTwoFactorAuthentication({ twoFactorCode: code.code })
					await account.refetch()
				} else {
					if (account.settings.twoFactorEnabled === 0) {
						return
					}

					const code = await showTwoFactorCodeDialog({
						title: "d",
						continueButtonText: "ddd",
						description: "ookeoetrasher",
						continueButtonVariant: "destructive"
					})

					if (code.cancelled) {
						return
					}

					toast = loadingToast()

					await worker.disableTwoFactorAuthentication({ twoFactorCode: code.code })
					await account.refetch()
				}
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				if (toast) {
					toast.dismiss()
				}
			}
		},
		[account, loadingToast, errorToast]
	)

	const exportMasterKeys = useCallback(async () => {
		if (!account) {
			return
		}

		try {
			const fileHandle = await showSaveFilePicker({
				suggestedName: `${account.account.email}.masterKeys.txt`
			})
			const writer = await fileHandle.createWritable()

			const toast = loadingToast()

			try {
				await writer.write(
					Buffer.from(
						masterKeys.map(key => "_VALID_FILEN_MASTERKEY_" + key + "@" + userId + "_VALID_FILEN_MASTERKEY_").join("|"),
						"utf-8"
					).toString("base64")
				)

				await writer.close()
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

					toast.update({
						id: toast.id,
						duration: 5000
					})
				}
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			}
		} finally {
			const input = document.getElementById("avatar-input") as HTMLInputElement

			input.value = ""
		}
	}, [loadingToast, errorToast, account, masterKeys, userId])

	const changePassword = useCallback(() => {
		eventEmitter.emit("openChangePasswordDialog")
	}, [])

	if (!account) {
		return null
	}

	return (
		<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
			<div className="flex flex-col p-6 w-5/6 h-full">
				<div className="flex flex-col gap-4">
					<Section
						name="Password"
						info="Change your password"
					>
						<p
							className="underline cursor-pointer"
							onClick={changePassword}
						>
							Change
						</p>
					</Section>
					<Section
						name="Two Factor Authentication"
						info="Enable or disable Two Factor Authentication"
					>
						<Switch
							checked={account.settings.twoFactorEnabled === 1}
							onCheckedChange={onTwoFactorChange}
						/>
					</Section>
					<Section
						name="Export master keys"
						info="Export your master keys so that you can restore your account in case you need to reset your password. You need to export your master keys everytime you change your password."
						className="mt-10"
					>
						<p
							className="underline cursor-pointer"
							onClick={exportMasterKeys}
						>
							Export
						</p>
					</Section>
					<div className="w-full h-20" />
				</div>
			</div>
			<ChangePasswordDialog />
		</div>
	)
})

export default Security