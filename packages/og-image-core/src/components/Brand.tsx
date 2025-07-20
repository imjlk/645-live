import type * as React from "react";

interface BrandProps {
	accentColor: string;
	textColor: string;
	logoUrl?: string;
}

export const Brand: React.FC<BrandProps> = ({
	accentColor,
	textColor,
	logoUrl,
}) => {
	return (
		<div
			style={{
				position: "absolute",
				bottom: "80px",
				right: "80px",
				display: "flex",
				alignItems: "center",
				gap: "20px",
			}}
		>
			{logoUrl && (
				<img
					src={logoUrl}
					alt="Brand Logo"
					style={{
						width: "40px",
						height: "40px",
						borderRadius: "6px",
					}}
				/>
			)}
			<div
				style={{
					width: "8px",
					height: "60px",
					backgroundColor: accentColor,
					borderRadius: "4px",
				}}
			/>
			<span
				style={{
					fontSize: "24px",
					color: textColor,
					opacity: 0.6,
				}}
			>
				645.live
			</span>
		</div>
	);
};
