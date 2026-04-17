from django.http import HttpResponse

def home_page(request):
    return HttpResponse("<h1>Habsify Backend is LIVE ✅</h1>", status=200)


