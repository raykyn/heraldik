from django.contrib import admin

from .models import NormEntry, MissingEntry

admin.site.register(NormEntry)
admin.site.register(MissingEntry)
