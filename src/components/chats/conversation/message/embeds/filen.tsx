import { memo, useMemo } from "react"
import Container from "./container"
import { parseFilenPublicLink } from "../utils"
import { useTheme } from "@/providers/themeProvider"
import { PUBLIC_LINK_BASE_URL } from "@/constants"

export const Filen = memo(({ link, messageUUID }: { link: string; messageUUID: string }) => {
	const { dark } = useTheme()

	const parsed = useMemo(() => {
		return parseFilenPublicLink(link)
	}, [link])

	return (
		<Container
			title="Filen"
			link={link}
			color="blue"
			messageUUID={messageUUID}
			noBackground={true}
		>
			<a
				href={link}
				target="_blank"
			>
				<iframe
					width="100%"
					height="210px"
					loading="eager"
					src={`${PUBLIC_LINK_BASE_URL}${parsed.uuid}#${parsed.key}?embed=true&theme=${dark ? "dark" : "light"}&chatEmbed=true`}
					title="Filen"
					style={{
						borderRadius: "10px",
						overflow: "hidden",
						border: "none"
					}}
				/>
			</a>
		</Container>
	)
})

export default Filen