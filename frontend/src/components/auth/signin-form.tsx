import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import heroImage from "@/assets/hero.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"

const signInSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập hoặc email."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
})

type SignInFormValues = z.infer<typeof signInSchema>

export function SigninForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const signIn = useAuthStore((state) => state.signIn)
  const loading = useAuthStore((state) => state.loading)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInFormValues) => {
    await signIn(data.username, data.password)
    navigate("/", { replace: true })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-white/50 bg-white/90 py-0 backdrop-blur">
        <CardContent className="grid p-0 lg:grid-cols-[1.05fr_0.95fr]">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Zalegram
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Chào mừng bạn trở lại
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Đăng nhập để tiếp tục trò chuyện và kết nối với mọi người.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập hoặc Email</Label>
                <Input
                  id="username"
                  placeholder="Nhập email của bạn"
                  {...register("username")}
                  aria-invalid={Boolean(errors.username)}
                />
                {errors.username ? (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  {...register("password")}
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              <Button className="h-10 w-full" type="submit" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link className="font-medium text-primary hover:underline" to="/register">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </form>

          <div className="relative hidden min-h-[320px] overflow-hidden bg-slate-950 lg:block">
            <img
              src={heroImage}
              alt="Security themed artwork"
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(37,99,235,0.82),rgba(15,23,42,0.9))]" />
            <div className="relative flex h-full flex-col justify-end gap-3 p-8 text-white">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/75">
                Bảo mật & Nhanh chóng
              </p>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight">
                Trải nghiệm nhắn tin mượt mà và an toàn.
              </h2>
              <p className="max-w-sm text-sm text-white/75">
                Nền tảng nhắn tin tốc độ cao với hệ thống bảo mật tối ưu. Dễ dàng
                chia sẻ tài liệu, gọi video và đồng bộ trên mọi thiết bị của bạn.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
