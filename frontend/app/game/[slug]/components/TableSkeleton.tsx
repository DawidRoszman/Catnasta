import { CardSkeleton, Skeleton } from "@/app/components/ui/Skeleton";

/** Placeholder shaped like the 3D table while the scene and card art load. */
export default function TableSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6" id="table-skeleton">
      <div className="relative aspect-[16/10] w-full max-w-5xl [perspective:1400px]">
        <div className="absolute inset-0 rounded-[3rem] bg-[#3a2314]/60 ring-1 ring-white/5 [transform:rotateX(38deg)]">
          <div className="absolute inset-5 flex flex-col justify-between rounded-[2.4rem] bg-felt-700/50 p-8">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 9 }, (_, i) => (
                <CardSkeleton key={i} width={44} />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <CardSkeleton width={60} />
                <CardSkeleton width={60} />
                <CardSkeleton width={60} />
              </div>
              <div className="flex gap-4">
                <CardSkeleton width={60} />
                <CardSkeleton width={60} />
              </div>
            </div>
            <Skeleton className="h-2 w-2/3 rounded-full" />
          </div>
        </div>
        <div className="absolute inset-x-0 -bottom-6 flex justify-center gap-1.5">
          {Array.from({ length: 13 }, (_, i) => (
            <CardSkeleton key={i} width={70} />
          ))}
        </div>
      </div>
    </div>
  );
}
