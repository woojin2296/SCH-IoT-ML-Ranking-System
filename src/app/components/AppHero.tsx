import Image from "next/image";

export default function AppHero() {
  return (
    <div className={"flex flex-col items-center justify-center gap-2"}>
      <div className="flex items-center gap-2">
        <Image
          src="/schiot_logo.png"
          alt="SCH Logo"
          width={150}
          height={150}
          priority
        />
        <Image
          src="/ubicomplab_logo.png"
          alt="UBICOMPLAB Logo"
          width={147}
          height={147}
          priority
        />
      </div>
      <div className="mb-2 flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">
          머신러닝 미니 프로젝트 랭킹 시스템
        </h1>
      </div>
    </div>
  );
}
